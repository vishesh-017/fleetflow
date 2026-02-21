from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True)
    password = db.Column(db.String(120))
    role = db.Column(db.String(20))  # manager, dispatcher

class Vehicle(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    plate = db.Column(db.String(20), unique=True)
    capacity = db.Column(db.Float)
    status = db.Column(db.String(20), default='available')

class Driver(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    status = db.Column(db.String(20), default='available')

class Trip(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicle.id'))
    driver_id = db.Column(db.Integer, db.ForeignKey('driver.id'))
    cargo_weight = db.Column(db.Float)
    status = db.Column(db.String(20), default='draft')
    vehicle = db.relationship('Vehicle')
    driver = db.relationship('Driver')

def to_dict(self):
    return {
        'id': self.id,
        'plate': self.plate,
        'capacity': self.capacity,
        'status': self.status
    }
