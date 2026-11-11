export type DashboardAction = "volunteers" | "enrollments" | "notifications";

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
      description: "La gestión de actividades estará disponible en una próxima entrega.",
      action: null,
    },
    {
      icon: "👥",
      title: "Participantes y asistencia",
      description: "El seguimiento de participantes aún no está disponible en la app.",
      action: null,
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
      description: "La administración de cuentas no está habilitada en la app.",
      action: null,
    },
    {
      icon: "📝",
      title: "Revisión de contenido",
      description: "La revisión de publicaciones aún no está disponible en la app.",
      action: null,
    },
    {
      icon: "📊",
      title: "Auditoría y reportes",
      description: "Los reportes administrativos quedan para una próxima entrega.",
      action: null,
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
