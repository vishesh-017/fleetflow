import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PageHeader } from '@/components/features/PageHeader';
import { DataTable } from '@/components/features/DataTable';
import { StatusBadge } from '@/components/features/StatusBadge';
import { useFuelLogs, useExpenses } from '@/hooks/use-fleet-data';
import { mockVehicles } from '@/services/mock-api';
import { api } from '@/services/mock-api';
import { toast } from '@/hooks/use-toast';
import { ExpenseCategory } from '@/types';
import type { FuelLog, Expense } from '@/types';

const fuelSchema = z.object({
  vehicleId: z.string().min(1, 'Required'),
  liters: z.coerce.number().min(0.1, 'Must be positive'),
  cost: z.coerce.number().min(0.01, 'Must be positive'),
  station: z.string().trim().min(1, 'Required').max(100),
  date: z.string().min(1, 'Required'),
});

const expenseSchema = z.object({
  vehicleId: z.string().min(1, 'Required'),
  category: z.nativeEnum(ExpenseCategory),
  amount: z.coerce.number().min(0.01, 'Must be positive'),
  date: z.string().min(1, 'Required'),
  notes: z.string().max(500).optional(),
});

type FuelForm = z.infer<typeof fuelSchema>;
type ExpenseForm = z.infer<typeof expenseSchema>;

export default function FuelExpensesPage() {
  const [fuelPage, setFuelPage] = useState(1);
  const [expensePage, setExpensePage] = useState(1);
  const [fuelDrawerOpen, setFuelDrawerOpen] = useState(false);
  const [expenseDrawerOpen, setExpenseDrawerOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: fuelData, isLoading: fuelLoading } = useFuelLogs(fuelPage, 10);
  const { data: expenseData, isLoading: expenseLoading } = useExpenses(expensePage, 10);

  const fuelMutation = useMutation({
    mutationFn: (data: Partial<FuelLog>) => api.fuel.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-logs'] });
      setFuelDrawerOpen(false);
      toast({ title: 'Fuel log recorded' });
    },
  });

  const expenseMutation = useMutation({
    mutationFn: (data: Partial<Expense>) => api.expenses.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setExpenseDrawerOpen(false);
      toast({ title: 'Expense recorded' });
    },
  });

  const fuelForm = useForm<FuelForm>({ resolver: zodResolver(fuelSchema) });
  const expenseForm = useForm<ExpenseForm>({ resolver: zodResolver(expenseSchema) });

  // Monthly cost chart data
  const monthlyData = [
    { vehicle: 'FL-0100', cost: 420 }, { vehicle: 'FL-0101', cost: 380 },
    { vehicle: 'FL-0102', cost: 310 }, { vehicle: 'FL-0103', cost: 520 },
    { vehicle: 'FL-0104', cost: 290 }, { vehicle: 'FL-0105', cost: 450 },
  ];

  const fuelColumns = [
    { key: 'vehicle', header: 'Vehicle', render: (f: FuelLog) => <span className="font-mono">{f.vehicle?.plateNumber}</span> },
    { key: 'liters', header: 'Liters', render: (f: FuelLog) => `${f.liters} L` },
    { key: 'cost', header: 'Cost', render: (f: FuelLog) => `$${f.cost}` },
    { key: 'station', header: 'Station' },
    { key: 'efficiency', header: 'Efficiency', render: (f: FuelLog) => f.efficiency ? `${f.efficiency.toFixed(1)} km/L` : '—' },
    { key: 'date', header: 'Date' },
    { key: 'anomaly', header: '', render: (f: FuelLog) => f.isAnomaly ? <StatusBadge variant="warning">Anomaly</StatusBadge> : null },
  ];

  const expenseColumns = [
    { key: 'vehicle', header: 'Vehicle', render: (e: Expense) => <span className="font-mono">{e.vehicle?.plateNumber}</span> },
    { key: 'category', header: 'Category', render: (e: Expense) => <StatusBadge variant="secondary" dot={false}>{e.category}</StatusBadge> },
    { key: 'amount', header: 'Amount', render: (e: Expense) => `$${e.amount}` },
    { key: 'date', header: 'Date' },
    { key: 'notes', header: 'Notes', render: (e: Expense) => e.notes || '—' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Fuel & Expenses" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Fuel & Expenses' }]} />

      <Tabs defaultValue="fuel">
        <TabsList>
          <TabsTrigger value="fuel">Fuel Logs</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="fuel" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setFuelDrawerOpen(true)}><Plus className="mr-2 h-4 w-4" />Log Fuel</Button>
          </div>
          <DataTable<FuelLog> columns={fuelColumns} data={fuelData?.data || []} isLoading={fuelLoading}
            page={fuelPage} totalPages={fuelData?.totalPages || 1} onPageChange={setFuelPage} />
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4 mt-4">
          <div className="flex justify-between items-end">
            <div className="rounded-lg border border-border bg-card p-4 flex-1 mr-4">
              <h3 className="text-sm font-semibold text-card-foreground mb-3">Monthly Cost by Vehicle</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="vehicle" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Button onClick={() => setExpenseDrawerOpen(true)}><Plus className="mr-2 h-4 w-4" />Log Expense</Button>
          </div>
          <DataTable<Expense> columns={expenseColumns} data={expenseData?.data || []} isLoading={expenseLoading}
            page={expensePage} totalPages={expenseData?.totalPages || 1} onPageChange={setExpensePage} />
        </TabsContent>
      </Tabs>

      {/* Fuel Drawer */}
      <Sheet open={fuelDrawerOpen} onOpenChange={setFuelDrawerOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>Log Fuel</SheetTitle></SheetHeader>
          <form onSubmit={fuelForm.handleSubmit((d) => { fuelMutation.mutate(d as unknown as Partial<FuelLog>); fuelForm.reset(); })} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <Select onValueChange={v => fuelForm.setValue('vehicleId', v)}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>{mockVehicles.slice(0, 20).map(v => <SelectItem key={v.id} value={v.id}>{v.plateNumber}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Liters</Label><Input type="number" step="0.1" {...fuelForm.register('liters')} /></div>
              <div className="space-y-2"><Label>Cost ($)</Label><Input type="number" step="0.01" {...fuelForm.register('cost')} /></div>
            </div>
            <div className="space-y-2"><Label>Station</Label><Input {...fuelForm.register('station')} placeholder="Shell, BP..." /></div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" {...fuelForm.register('date')} /></div>
            <Button type="submit" className="w-full" disabled={fuelMutation.isPending}>Log Fuel</Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Expense Drawer */}
      <Sheet open={expenseDrawerOpen} onOpenChange={setExpenseDrawerOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>Log Expense</SheetTitle></SheetHeader>
          <form onSubmit={expenseForm.handleSubmit((d) => { expenseMutation.mutate(d as unknown as Partial<Expense>); expenseForm.reset(); })} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <Select onValueChange={v => expenseForm.setValue('vehicleId', v)}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>{mockVehicles.slice(0, 20).map(v => <SelectItem key={v.id} value={v.id}>{v.plateNumber}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select {...expenseForm.register('category')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {Object.values(ExpenseCategory).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Amount ($)</Label><Input type="number" step="0.01" {...expenseForm.register('amount')} /></div>
              <div className="space-y-2"><Label>Date</Label><Input type="date" {...expenseForm.register('date')} /></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea {...expenseForm.register('notes')} /></div>
            <Button type="submit" className="w-full" disabled={expenseMutation.isPending}>Log Expense</Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
