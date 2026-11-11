export type DashboardAction =
  | "volunteers"
  | "enrollments"
  | "notifications"
  | "manageVolunteers"
  | "users"
  | "moderation"
  | "audit";

export type DashboardCard = {
  icon: string;
  title: string;
  description: string;
  action: DashboardAction | null;
};

export type RoleDashboard = {
  title: string;
  subtitle: string;
  cards: DashboardCard[];
};

const VOLUNTEER_DASHBOARD: RoleDashboard = {
  title: "Tu espacio Regenera",
  subtitle: "Súmate a acciones que cuidan tu comunidad y el entorno.",
  cards: [
    {
      icon: "🌿",
      title: "Explorar voluntariados",
      description: "Encuentra actividades abiertas y consulta sus detalles.",
      action: "volunteers",
    },
    {
      icon: "🎟️",
      title: "Mis inscripciones",
      description: "Consulta tus actividades y administra tu participación.",
      action: "enrollments",
    },
    {
      icon: "🔔",
      title: "Notificaciones",
      description: "Revisa confirmaciones, cambios y recordatorios.",
      action: "notifications",
    },
  ],
};

const ORGANIZER_DASHBOARD: RoleDashboard = {
  title: "Panel de organizador",
  subtitle: "Consulta tus participaciones y mantente al tanto de la comunidad.",
  cards: [
    {
      icon: "🎟️",
      title: "Mis inscripciones",
      description: "Consulta las actividades en las que participas.",
      action: "enrollments",
    },
    {
      icon: "🔔",
      title: "Notificaciones",
      description: "Revisa avisos y novedades de tus actividades.",
      action: "notifications",
    },
    {
      icon: "📅",
      title: "Mis voluntariados",
      description: "Crea actividades y revisa el estado de publicación.",
      action: "manageVolunteers",
    },
    {
      icon: "👥",
      title: "Participantes y asistencia",
      description: "Consulta participantes y confirma su asistencia.",
      action: "manageVolunteers",
    },
  ],
};

const ADMIN_DASHBOARD: RoleDashboard = {
  title: "Panel de administración",
  subtitle: "Vista previa de las herramientas administrativas de Regenera.",
  cards: [
    {
      icon: "🔔",
      title: "Notificaciones",
      description: "Consulta las notificaciones asociadas a tu perfil.",
      action: "notifications",
    },
    {
      icon: "🛡️",
      title: "Usuarios y roles",
      description: "Busca cuentas, cambia roles y activa o desactiva usuarios.",
      action: "users",
    },
    {
      icon: "📝",
      title: "Revisión de contenido",
      description: "Revisa actividades, artículos, lugares y registros naturales.",
      action: "moderation",
    },
    {
      icon: "📊",
      title: "Auditoría y reportes",
      description: "Consulta las acciones administrativas registradas.",
      action: "audit",
    },
  ],
};

export function getDashboardForRole(role: string): RoleDashboard {
  if (role === "usuario") return VOLUNTEER_DASHBOARD;
  if (role === "organizador") return ORGANIZER_DASHBOARD;
  if (role === "admin") return ADMIN_DASHBOARD;

  return {
    title: "Tu espacio Regenera",
    subtitle: "Aún no hay un panel asignado a este perfil.",
    cards: [],
  };
}
