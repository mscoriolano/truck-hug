export interface Driver {
  id: string;
  name: string;
  avatar?: string;
  phone: string;
  license: string;
  status: 'available' | 'driving' | 'resting' | 'off';
  currentVehicle?: string;
  journeyStart?: Date;
  totalHoursToday: number;
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  brand: string;
  year: number;
  mileage: number;
  status: 'active' | 'maintenance' | 'inactive';
  nextMaintenance: Date;
  fuelType: 'diesel' | 'gasoline' | 'flex' | 'electric';
}

export interface Maintenance {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  type: 'preventive' | 'corrective';
  category: 'engine' | 'tires' | 'brakes' | 'suspension' | 'electrical' | 'general';
  description: string;
  scheduledDate: Date;
  completedDate?: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'overdue';
  cost?: number;
  notes?: string;
}

export interface Tire {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  position: string;
  brand: string;
  model: string;
  installDate: Date;
  installMileage: number;
  currentMileage: number;
  maxMileage: number;
  status: 'good' | 'warning' | 'critical' | 'replaced';
  lastInspection: Date;
}

export interface JourneyEntry {
  id: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehiclePlate: string;
  type: 'start' | 'break_start' | 'break_end' | 'end';
  timestamp: Date;
  location?: string;
  mileage?: number;
}

export interface Alert {
  id: string;
  type: 'maintenance' | 'tire' | 'journey' | 'general';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  relatedId?: string;
}
