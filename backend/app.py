
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///fleetflow.db'
app.config['JWT_SECRET_KEY'] = 'fleetflow-secret-123'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
jwt = JWTManager(app)
CORS(app, resources={r"/*": {"origins": "*"}})


# ─────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # manager, dispatcher, safety_officer, analyst

class Vehicle(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    model = db.Column(db.String(100))
    plate = db.Column(db.String(20), unique=True, nullable=False)
    vehicle_type = db.Column(db.String(20))           # Truck, Van, Bike
    capacity = db.Column(db.Float, nullable=False)
    odometer = db.Column(db.Float, default=0.0)
    region = db.Column(db.String(50))
    status = db.Column(db.String(20), default='available')  # available, on_trip, in_shop, retired
    acquisition_cost = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name, 'model': self.model,
            'plate': self.plate, 'vehicle_type': self.vehicle_type,
            'capacity': self.capacity, 'odometer': self.odometer,
            'region': self.region, 'status': self.status,
            'acquisition_cost': self.acquisition_cost,
            'created_at': self.created_at.isoformat()
        }

class Driver(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    license_number = db.Column(db.String(50), unique=True)
    license_expiry = db.Column(db.Date)
    license_category = db.Column(db.String(20))       # Van, Truck, Bike
    status = db.Column(db.String(20), default='off_duty')  # on_duty, off_duty, suspended, on_trip
    safety_score = db.Column(db.Float, default=100.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def is_license_valid(self):
        if not self.license_expiry:
            return False
        return self.license_expiry >= date.today()

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name,
            'license_number': self.license_number,
            'license_expiry': self.license_expiry.isoformat() if self.license_expiry else None,
            'license_category': self.license_category,
            'status': self.status, 'safety_score': self.safety_score,
            'license_valid': self.is_license_valid()
        }

class Trip(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicle.id'), nullable=False)
    driver_id = db.Column(db.Integer, db.ForeignKey('driver.id'), nullable=False)
    cargo_weight = db.Column(db.Float, nullable=False)
    origin = db.Column(db.String(100))
    destination = db.Column(db.String(100))
    status = db.Column(db.String(20), default='draft')  # draft, dispatched, completed, cancelled
    start_odometer = db.Column(db.Float)
    end_odometer = db.Column(db.Float)
    estimated_fuel_cost = db.Column(db.Float, default=0.0)
    revenue = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    vehicle = db.relationship('Vehicle', backref='trips')
    driver = db.relationship('Driver', backref='trips')

    def distance_km(self):
        if self.start_odometer and self.end_odometer:
            return self.end_odometer - self.start_odometer
        return 0

    def to_dict(self):
        return {
            'id': self.id, 'vehicle_id': self.vehicle_id, 'driver_id': self.driver_id,
            'cargo_weight': self.cargo_weight, 'origin': self.origin,'estimated_fuel_cost': self.estimated_fuel_cost,
            'destination': self.destination, 'status': self.status,
            'start_odometer': self.start_odometer, 'end_odometer': self.end_odometer,
            'distance_km': self.distance_km(), 'revenue': self.revenue,
            'created_at': self.created_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }

class MaintenanceLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicle.id'), nullable=False)
    service_type = db.Column(db.String(100))
    description = db.Column(db.Text)
    resolved = db.Column(db.Boolean, default=False)
    cost = db.Column(db.Float, default=0.0)
    date = db.Column(db.Date, default=date.today)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    vehicle = db.relationship('Vehicle', backref='maintenance_logs')

    def to_dict(self):
        return {
            'id': self.id, 'vehicle_id': self.vehicle_id, 'resolved': self.resolved,
            'service_type': self.service_type, 'description': self.description,
            'cost': self.cost, 'date': self.date.isoformat()
        }

class FuelLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicle.id'), nullable=False)
    trip_id = db.Column(db.Integer, db.ForeignKey('trip.id'), nullable=True)
    liters = db.Column(db.Float, nullable=False)
    cost = db.Column(db.Float, nullable=False)
    date = db.Column(db.Date, default=date.today)
    odometer_at_fill = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    vehicle = db.relationship('Vehicle', backref='fuel_logs')
    misc_expense = db.Column(db.Float, default=0.0)
    distance_km  = db.Column(db.Float, default=0.0)

    def to_dict(self):
        return {
            'id': self.id, 'vehicle_id': self.vehicle_id, 'trip_id': self.trip_id,'misc_expense': self.misc_expense,
            'distance_km': self.distance_km,
            'liters': self.liters, 'cost': self.cost,
            'date': self.date.isoformat(), 'odometer_at_fill': self.odometer_at_fill
        }


# ─────────────────────────────────────────
# SEED DATA
# ─────────────────────────────────────────

with app.app_context():
    db.create_all()
    if not User.query.first():
        db.session.add_all([
            User(email='manager@test.com', password='123', role='manager'),
            User(email='dispatcher@test.com', password='123', role='dispatcher'),
            User(email='safety@test.com', password='123', role='safety_officer'),
            User(email='analyst@test.com', password='123', role='analyst'),
        ])
        db.session.commit()


# ─────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────
@app.route('/check-email', methods=['POST'])
def check_email():
    data = request.get_json()
    email = data.get('email', '').strip()
    user = User.query.filter_by(email=email).first()
    if user:
        return jsonify({'exists': True})
    return jsonify({'exists': False})

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email'), password=data.get('password')).first()
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401
    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'role': user.role})

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data.get('name') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'name, email and password are required'}), 400
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 409
    user = User(
        email=data['email'],
        password=data['password'],
        role=data.get('role', 'dispatcher')
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'Account created'}), 201
# ─────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────

@app.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    total = Vehicle.query.count()
    active = Vehicle.query.filter_by(status='on_trip').count()
    in_shop = Vehicle.query.filter_by(status='in_shop').count()
    idle = Vehicle.query.filter_by(status='available').count()
    pending_cargo = Trip.query.filter_by(status='draft').count()

    return jsonify({
        'active_fleet': active,
        'in_shop': in_shop,
        'idle': idle,
        'total': total,
        'utilization_rate': round((active / total) * 100, 1) if total else 0,
        'pending_cargo': pending_cargo
    })


# ─────────────────────────────────────────
# VEHICLES
# ─────────────────────────────────────────

@app.route('/vehicles', methods=['GET', 'POST'])
@jwt_required()
def vehicles():
    if request.method == 'GET':
        query = Vehicle.query
        # Filters: ?type=Van&status=available&region=North
        if t := request.args.get('type'):
            query = query.filter_by(vehicle_type=t)
        if s := request.args.get('status'):
            query = query.filter_by(status=s)
        if r := request.args.get('region'):
            query = query.filter_by(region=r)
        return jsonify([v.to_dict() for v in query.all()])

    data = request.get_json()
    if not data.get('plate') or not data.get('capacity'):
        return jsonify({'error': 'plate and capacity are required'}), 400

    if Vehicle.query.filter_by(plate=data['plate']).first():
        return jsonify({'error': 'Plate already exists'}), 409

    vehicle = Vehicle(
        name=data.get('name'),
        model=data.get('model'),
        plate=data['plate'],
        vehicle_type=data.get('vehicle_type'),
        capacity=float(data['capacity']),
        odometer=float(data.get('odometer', 0)),
        region=data.get('region'),
        acquisition_cost=float(data.get('acquisition_cost', 0))
    )
    db.session.add(vehicle)
    db.session.commit()
    return jsonify(vehicle.to_dict()), 201


@app.route('/vehicles/<int:vid>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def vehicle_detail(vid):
    v = Vehicle.query.get_or_404(vid)

    if request.method == 'GET':
        return jsonify(v.to_dict())

    if request.method == 'PUT':
        data = request.get_json()
        for field in ['name', 'model', 'vehicle_type', 'region', 'odometer', 'acquisition_cost']:
            if field in data:
                setattr(v, field, data[field])
        # Manual retire toggle
        if 'status' in data and data['status'] == 'retired':
            v.status = 'retired'
        db.session.commit()
        return jsonify(v.to_dict())

    # DELETE
    db.session.delete(v)
    db.session.commit()
    return jsonify({'message': 'Vehicle deleted'})


# ─────────────────────────────────────────
# DRIVERS
# ─────────────────────────────────────────

@app.route('/drivers', methods=['GET', 'POST'])
@jwt_required()
def drivers():
    if request.method == 'GET':
        return jsonify([d.to_dict() for d in Driver.query.all()])

    data = request.get_json()
    if not data.get('name'):
        return jsonify({'error': 'name is required'}), 400

    expiry = None
    if data.get('license_expiry'):
        expiry = date.fromisoformat(data['license_expiry'])

    driver = Driver(
        name=data['name'],
        license_number=data.get('license_number'),
        license_expiry=expiry,
        license_category=data.get('license_category'),
        safety_score=float(data.get('safety_score', 100.0))
    )
    db.session.add(driver)
    db.session.commit()
    return jsonify(driver.to_dict()), 201


@app.route('/drivers/<int:did>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def driver_detail(did):
    d = Driver.query.get_or_404(did)

    if request.method == 'GET':
        return jsonify(d.to_dict())

    if request.method == 'PUT':
        data = request.get_json()
        for field in ['name', 'license_number', 'license_category', 'safety_score']:
            if field in data:
                setattr(d, field, data[field])
        if 'license_expiry' in data:
            d.license_expiry = date.fromisoformat(data['license_expiry'])
        # Status toggle: on_duty / off_duty / suspended
        if 'status' in data and data['status'] in ['on_duty', 'off_duty', 'suspended']:
            d.status = data['status']
        db.session.commit()
        return jsonify(d.to_dict())

    db.session.delete(d)
    db.session.commit()
    return jsonify({'message': 'Driver deleted'})


# ─────────────────────────────────────────
# TRIPS
# ─────────────────────────────────────────

@app.route('/trips', methods=['GET', 'POST'])
@jwt_required()
def trips():
    if request.method == 'GET':
        return jsonify([t.to_dict() for t in Trip.query.all()])

    data = request.get_json()
    vehicle = Vehicle.query.get_or_404(data.get('vehicle_id'))
    driver = Driver.query.get_or_404(data.get('driver_id'))
    cargo = float(data.get('cargo_weight', 0))

    # ── VALIDATION RULES ──────────────────
    if vehicle.status != 'available':
        return jsonify({'error': f'Vehicle is {vehicle.status}, not available'}), 400

    if not driver.is_license_valid():
        return jsonify({'error': 'Driver license is expired or missing'}), 400

    if driver.status in ['suspended', 'on_trip']:
        return jsonify({'error': f'Driver is {driver.status}'}), 400

    if cargo > vehicle.capacity:                          # Core capacity check
        return jsonify({
            'error': f'Cargo {cargo}kg exceeds vehicle capacity {vehicle.capacity}kg'
        }), 400
    
    if driver.license_category and vehicle.vehicle_type:
        if driver.license_category.lower() != vehicle.vehicle_type.lower():
            return jsonify({
                'error': f"License mismatch: driver holds '{driver.license_category}' license but vehicle is a '{vehicle.vehicle_type}'"
            }), 400
    # ─────────────────────────────────────

    trip = Trip(
        vehicle_id=vehicle.id, driver_id=driver.id,
        cargo_weight=cargo, origin=data.get('origin'),
        estimated_fuel_cost=float(data.get('estimated_fuel_cost', 0)),
        destination=data.get('destination'),
        start_odometer=vehicle.odometer,
        revenue=float(data.get('revenue', 0)),
        status='draft'
    )
   

    db.session.add(trip)
    db.session.commit()
    return jsonify(trip.to_dict()), 201


@app.route('/trips/<int:tid>', methods=['GET', 'PUT'])
@jwt_required()
def trip_detail(tid):
    trip = Trip.query.get_or_404(tid)

    if request.method == 'GET':
        return jsonify(trip.to_dict())

    data = request.get_json()
    new_status = data.get('status')

    if new_status == 'dispatched':
        trip.status = 'dispatched'
        trip.vehicle.status = 'on_trip'
        trip.driver.status = 'on_trip'

    elif new_status == 'completed':
        end_odo = float(data.get('end_odometer', 0))
        trip.end_odometer = end_odo
        trip.status = 'completed'
        trip.completed_at = datetime.utcnow()
        trip.vehicle.odometer = end_odo
        trip.vehicle.status = 'available'
        trip.driver.status = 'off_duty'
        trip.driver.safety_score = min(100, trip.driver.safety_score + 1)

    elif new_status == 'cancelled':
        trip.status = 'cancelled'
        trip.vehicle.status = 'available'
        trip.driver.status = 'off_duty'

    db.session.commit()
    return jsonify(trip.to_dict())


# ─────────────────────────────────────────
# MAINTENANCE LOGS
# ─────────────────────────────────────────

@app.route('/maintenance', methods=['GET', 'POST'])
@jwt_required()
def maintenance():
    if request.method == 'GET':
        vid = request.args.get('vehicle_id')
        query = MaintenanceLog.query
        if vid:
            query = query.filter_by(vehicle_id=vid)
        return jsonify([m.to_dict() for m in query.all()])

    data = request.get_json()
    vehicle = Vehicle.query.get_or_404(data.get('vehicle_id'))

    log = MaintenanceLog(
        vehicle_id=vehicle.id,
        service_type=data.get('service_type'),
        description=data.get('description'),
        cost=float(data.get('cost', 0)),
        date=date.fromisoformat(data['date']) if data.get('date') else date.today()
    )
    # ── AUTO-LOGIC: vehicle goes In Shop ──
    vehicle.status = 'in_shop'

    db.session.add(log)
    db.session.commit()
    return jsonify(log.to_dict()), 201


@app.route('/maintenance/<int:mid>/resolve', methods=['PUT'])
@jwt_required()
def resolve_maintenance(mid):
    """Mark maintenance done → vehicle back to available."""
    log = MaintenanceLog.query.get_or_404(mid)
    log.resolved = True 
    log.vehicle.status = 'available'
    db.session.commit()
    return jsonify({'message': 'Vehicle returned to available', 'vehicle': log.vehicle.to_dict()})


# ─────────────────────────────────────────
# FUEL LOGS
# ─────────────────────────────────────────

@app.route('/fuel', methods=['GET', 'POST'])
@jwt_required()
def fuel():
    if request.method == 'GET':
        vid = request.args.get('vehicle_id')
        query = FuelLog.query
        if vid:
            query = query.filter_by(vehicle_id=vid)
        return jsonify([f.to_dict() for f in query.all()])

    data = request.get_json()
    Vehicle.query.get_or_404(data.get('vehicle_id'))  # validate vehicle exists

    log = FuelLog(
        vehicle_id=data['vehicle_id'],
        trip_id=data.get('trip_id'),
        liters=float(data['liters']),
        misc_expense=float(data.get('misc_expense', 0)),
        distance_km=float(data.get('distance_km', 0)),
        cost=float(data['cost']),
        date=date.fromisoformat(data['date']) if data.get('date') else date.today(),
        odometer_at_fill=float(data.get('odometer_at_fill', 0))
    )
    db.session.add(log)
    db.session.commit()
    return jsonify(log.to_dict()), 201


# ─────────────────────────────────────────
# ANALYTICS
# ─────────────────────────────────────────

@app.route('/analytics', methods=['GET'])
@jwt_required()
def analytics():
    vehicles = Vehicle.query.all()
    report = []

    for v in vehicles:
        fuel_logs = FuelLog.query.filter_by(vehicle_id=v.id).all()
        maint_logs = MaintenanceLog.query.filter_by(vehicle_id=v.id).all()
        completed_trips = Trip.query.filter_by(vehicle_id=v.id, status='completed').all()

        total_fuel_cost = sum(f.cost for f in fuel_logs)
        total_liters = sum(f.liters for f in fuel_logs)
        total_maint_cost = sum(m.cost for m in maint_logs)
        total_revenue = sum(t.revenue for t in completed_trips)
        total_km = sum(t.distance_km() for t in completed_trips)

        fuel_efficiency = round(total_km / total_liters, 2) if total_liters else 0
        total_op_cost = total_fuel_cost + total_maint_cost
        roi = 0
        if v.acquisition_cost:
            roi = round((total_revenue - total_op_cost) / v.acquisition_cost * 100, 2)

        report.append({
            'vehicle_id': v.id,
            'plate': v.plate,
            'name': v.name,
            'total_trips': len(completed_trips),
            'total_km': round(total_km, 2),
            'total_fuel_cost': round(total_fuel_cost, 2),
            'total_maintenance_cost': round(total_maint_cost, 2),
            'total_operational_cost': round(total_op_cost, 2),
            'total_revenue': round(total_revenue, 2),
            'fuel_efficiency_km_per_l': fuel_efficiency,
            'cost_per_km': round(total_op_cost / total_km, 2) if total_km else 0,
            'roi_percent': roi
        })

    return jsonify(report)


@app.route('/analytics/drivers', methods=['GET'])
@jwt_required()
def driver_analytics():
    drivers = Driver.query.all()
    report = []
    for d in drivers:
        completed = Trip.query.filter_by(driver_id=d.id, status='completed').count()
        total = Trip.query.filter_by(driver_id=d.id).count()
        report.append({
            'driver_id': d.id,
            'name': d.name,
            'safety_score': d.safety_score,
            'license_valid': d.is_license_valid(),
            'license_expiry': d.license_expiry.isoformat() if d.license_expiry else None,
            'total_trips': total,
            'completed_trips': completed,
            'completion_rate': round((completed / total) * 100, 1) if total else 0,
            'status': d.status
        })
    return jsonify(report)
@app.route('/analytics/monthly', methods=['GET'])
@jwt_required()
def analytics_monthly():
    from sqlalchemy import extract, func
    result = []
    for month_num in range(1, 13):
        rev  = db.session.query(func.sum(Trip.revenue)).filter(
            extract('month', Trip.completed_at)==month_num, Trip.status=='completed').scalar() or 0
        fuel = db.session.query(func.sum(FuelLog.cost)).filter(
            extract('month', FuelLog.date)==month_num).scalar() or 0
        maint= db.session.query(func.sum(MaintenanceLog.cost)).filter(
            extract('month', MaintenanceLog.date)==month_num).scalar() or 0
        result.append({
            'month': ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month_num-1],
            'revenue': round(rev,2), 'fuel_cost': round(fuel,2),
            'maintenance': round(maint,2), 'net_profit': round(rev-fuel-maint,2),
            'efficiency': 0
        })
    return jsonify(result)

if __name__ == '__main__':

    app.run(debug=True, port=5000)
