export const partnerMe = {
  id: 42,
  email: 'ops@bhisa.id',
  fullName: 'Bhisa Operations',
  roles: ['partner'],
  partner: { id: 7, code: 'BHISA', name: 'Bhisa Shuttle', type: 'shuttle' },
  mustChangePassword: false,
};

export const adminMe = {
  id: 1,
  email: 'admin@fleet-taxi.id',
  fullName: 'Fleet Admin',
  roles: ['admin'],
  partner: null,
  mustChangePassword: false,
};

// A super_admin session — the only audience allowed into /admin/user-management.
export const superAdminMe = {
  id: 2,
  email: 'root@fleet-taxi.id',
  fullName: 'Fleet Super Admin',
  roles: ['super_admin'],
  partner: null,
  mustChangePassword: false,
};

// A couple of pre-registered plates for the mock partner so the scoped fleet
// grids show data out of the box. Norms match the mock grid vehicles
// (makeGojekGrid → B{1000+i}XYZ, makeGrabGrid → B{2000+i}GRB).
export const seedPartnerPlates = [
  { id: 1, plateNumber: 'B 1000 XYZ', plateNumberNorm: 'B1000XYZ', vehicleType: 'Premium - BYD M6' },
  { id: 2, plateNumber: 'B 1001 XYZ', plateNumberNorm: 'B1001XYZ', vehicleType: 'Reguler - Avanza' },
  { id: 3, plateNumber: 'B 2000 GRB', plateNumberNorm: 'B2000GRB', vehicleType: 'Reguler - Xenia' },
];
