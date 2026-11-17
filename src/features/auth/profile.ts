export const MIN_AGE = 13;
export const ADULT_AGE = 18;
export const MAX_SOCIAL_LINKS = 5;
export const MINIMUM_AGE_MESSAGE = "Debes tener al menos 13 años. Contacta a Regenerabcs@mail.com.";

export const GENDER_OPTIONS = [
  { value: "mujer", label: "Mujer" },
  { value: "hombre", label: "Hombre" },
  { value: "otro", label: "Otro" },
  { value: "prefiero_no_decirlo", label: "Prefiero no decirlo" },
] as const;

export type Gender = (typeof GENDER_OPTIONS)[number]["value"];

export type TutorDetails = {
  nombre: string | null;
  correo: string | null;
  telefono: string | null;
  fechaNacimiento: string | null;
  autorizacion: boolean;
};

export type ProfileDetails = {
  correoSecundario: string | null;
  telefono: string | null;
  descripcion: string | null;
  ciudad: string | null;
  fechaNacimiento: string | null;
  genero: string | null;
  generoOtro: string | null;
  organizacion: string | null;
  enlacesSociales: string[];
  privacidad: boolean;
  tutor: TutorDetails | null;
};

export type ProfileFormValues = {
  correoSecundario: string;
  telefono: string;
  descripcion: string;
  ciudad: string;
  fechaNacimiento: string;
  genero: Gender | "";
  generoOtro: string;
  organizacion: string;
  enlacesSociales: string;
  privacidad: boolean;
  tutorNombre: string;
  tutorCorreo: string;
  tutorTelefono: string;
  tutorFechaNacimiento: string;
  tutorAutorizacion: boolean;
};

export type ProfilePayload = {
  correoSecundario: string;
  telefono: string | null;
  descripcion: string | null;
  ciudad: string;
  fechaNacimiento: string;
  genero: Gender;
  generoOtro: string | null;
  privacidad: boolean;
  organizacion?: string | null;
  enlacesSociales?: string[];
  tutor?: {
    nombre: string;
    correo: string;
    telefono: string;
    fechaNacimiento: string;
    autorizacion: boolean;
  };
};

export type ProfileFormErrors = Partial<Record<keyof ProfileFormValues, string>>;

export type ProfileValidationContext = {
  // Primary account email, which the secondary email must differ from.
  email: string;
  role?: string;
  // Phone already stored for the account; the API accepts it unchanged even if legacy.
  currentPhone?: string | null;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function emptyProfileForm(): ProfileFormValues {
  return {
    correoSecundario: "",
    telefono: "",
    descripcion: "",
    ciudad: "",
    fechaNacimiento: "",
    genero: "",
    generoOtro: "",
    organizacion: "",
    enlacesSociales: "",
    privacidad: false,
    tutorNombre: "",
    tutorCorreo: "",
    tutorTelefono: "",
    tutorFechaNacimiento: "",
    tutorAutorizacion: false,
  };
}

export function profileFormFrom(details: ProfileDetails | null): ProfileFormValues {
  const form = emptyProfileForm();
  if (!details) return form;
  const gender = GENDER_OPTIONS.find((option) => option.value === details.genero)?.value ?? "";
  return {
    correoSecundario: details.correoSecundario ?? "",
    telefono: details.telefono ?? "",
    descripcion: details.descripcion ?? "",
    ciudad: details.ciudad ?? "",
    fechaNacimiento: details.fechaNacimiento ?? "",
    genero: gender,
    generoOtro: details.generoOtro ?? "",
    organizacion: details.organizacion ?? "",
    enlacesSociales: details.enlacesSociales.join("\n"),
    privacidad: details.privacidad,
    tutorNombre: details.tutor?.nombre ?? "",
    tutorCorreo: details.tutor?.correo ?? "",
    tutorTelefono: details.tutor?.telefono ?? "",
    tutorFechaNacimiento: details.tutor?.fechaNacimiento ?? "",
    tutorAutorizacion: details.tutor?.autorizacion === true,
  };
}

export function parseIsoDate(value: string): Date | null {
  const match = ISO_DATE_PATTERN.exec(value.trim());
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

export function formatIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// Completed years, matching Carbon's ->age in the API.
export function ageOn(birthDate: Date, today: Date = new Date()): number {
  let age = today.getFullYear() - birthDate.getFullYear();
  const beforeBirthday = today.getMonth() < birthDate.getMonth()
    || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function ageFromIsoDate(value: string, today: Date = new Date()): number | null {
  const date = parseIsoDate(value);
  if (!date || date.getTime() > today.getTime()) return null;
  return ageOn(date, today);
}

export function isMinor(value: string, today: Date = new Date()): boolean {
  const age = ageFromIsoDate(value, today);
  return age !== null && age >= MIN_AGE && age < ADULT_AGE;
}

function normalizePhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!/^\+?[0-9\s().-]+$/.test(trimmed)) return null;
  let digits = trimmed.replace(/\D/g, "");
  if (!trimmed.startsWith("+")) {
    if (digits.length !== 10) return null;
    digits = `52${digits}`;
  }
  return /^[1-9][0-9]{6,14}$/.test(digits) ? `+${digits}` : null;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function splitSocialLinks(value: string): string[] {
  return value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
}

export function validateProfileForm(
  values: ProfileFormValues,
  context: ProfileValidationContext,
  today: Date = new Date(),
): { errors: ProfileFormErrors; payload: ProfilePayload | null } {
  const errors: ProfileFormErrors = {};
  const secondary = values.correoSecundario.trim().toLocaleLowerCase("es-MX");
  const city = values.ciudad.trim();
  const phone = values.telefono.trim();
  const description = values.descripcion.trim();

  if (!secondary || !EMAIL_PATTERN.test(secondary)) {
    errors.correoSecundario = "Escribe un correo secundario válido.";
  } else if (secondary === context.email.trim().toLocaleLowerCase("es-MX")) {
    errors.correoSecundario = "El correo secundario debe ser distinto del principal.";
  }
  if (!city) errors.ciudad = "Escribe tu ciudad.";
  else if (city.length > 150) errors.ciudad = "La ciudad no puede superar 150 caracteres.";
  if (!values.genero) errors.genero = "Selecciona una opción de género.";
  if (values.generoOtro.trim().length > 100) errors.generoOtro = "Máximo 100 caracteres.";
  if (description.length > 1000) errors.descripcion = "La descripción no puede superar 1000 caracteres.";
  if (phone && normalizePhone(phone) === null && phone !== context.currentPhone) {
    errors.telefono = "Escribe un teléfono válido con lada internacional, por ejemplo +52.";
  }

  const birthDate = parseIsoDate(values.fechaNacimiento);
  let age: number | null = null;
  if (!birthDate) {
    errors.fechaNacimiento = "Escribe tu fecha de nacimiento con el formato AAAA-MM-DD.";
  } else if (birthDate.getTime() > today.getTime()) {
    errors.fechaNacimiento = "La fecha de nacimiento no puede ser futura.";
  } else {
    age = ageOn(birthDate, today);
    if (age < MIN_AGE) errors.fechaNacimiento = MINIMUM_AGE_MESSAGE;
  }

  const minor = age !== null && age >= MIN_AGE && age < ADULT_AGE;
  if (minor) {
    if (!values.tutorNombre.trim()) errors.tutorNombre = "Este dato del tutor es obligatorio.";
    if (!values.tutorCorreo.trim()) errors.tutorCorreo = "Este dato del tutor es obligatorio.";
    else if (!EMAIL_PATTERN.test(values.tutorCorreo.trim())) errors.tutorCorreo = "Escribe un correo válido.";
    if (!values.tutorTelefono.trim()) errors.tutorTelefono = "Este dato del tutor es obligatorio.";
    if (!values.tutorFechaNacimiento.trim()) {
      errors.tutorFechaNacimiento = "Este dato del tutor es obligatorio.";
    } else {
      const tutorBirth = parseIsoDate(values.tutorFechaNacimiento);
      if (!tutorBirth || tutorBirth.getTime() > today.getTime()) {
        errors.tutorFechaNacimiento = "Escribe una fecha válida con el formato AAAA-MM-DD.";
      } else if (ageOn(tutorBirth, today) < ADULT_AGE) {
        errors.tutorFechaNacimiento = "El tutor debe ser mayor de edad.";
      }
    }
    if (!values.tutorAutorizacion) {
      errors.tutorAutorizacion = "Declara que cuentas con autorización de tu tutor.";
    }
  }

  const isOrganizer = context.role === "organizador";
  const links = splitSocialLinks(values.enlacesSociales);
  if (isOrganizer) {
    if (values.organizacion.trim().length > 150) errors.organizacion = "Máximo 150 caracteres.";
    if (links.length > MAX_SOCIAL_LINKS) {
      errors.enlacesSociales = `Puedes agregar hasta ${MAX_SOCIAL_LINKS} enlaces.`;
    } else if (links.some((link) => !isHttpUrl(link) || link.length > 2048)) {
      errors.enlacesSociales = "Cada enlace debe comenzar con http:// o https://.";
    }
  }

  if (Object.keys(errors).length > 0 || !birthDate || !values.genero) {
    return { errors, payload: null };
  }

  const payload: ProfilePayload = {
    correoSecundario: secondary,
    telefono: phone || null,
    descripcion: description || null,
    ciudad: city,
    fechaNacimiento: values.fechaNacimiento.trim(),
    genero: values.genero,
    generoOtro: values.genero === "otro" ? values.generoOtro.trim() || null : null,
    privacidad: minor ? true : values.privacidad,
  };
  if (isOrganizer) {
    payload.organizacion = values.organizacion.trim() || null;
    payload.enlacesSociales = links;
  }
  if (minor) {
    payload.tutor = {
      nombre: values.tutorNombre.trim(),
      correo: values.tutorCorreo.trim().toLocaleLowerCase("es-MX"),
      telefono: values.tutorTelefono.trim(),
      fechaNacimiento: values.tutorFechaNacimiento.trim(),
      autorizacion: true,
    };
  }
  return { errors, payload };
}

// Maps API field names (including tutor.* dotted keys) onto form fields.
export function mapApiFieldErrors(fieldErrors: Record<string, string>): ProfileFormErrors {
  const mapping: Record<string, keyof ProfileFormValues> = {
    correoSecundario: "correoSecundario",
    telefono: "telefono",
    descripcion: "descripcion",
    ciudad: "ciudad",
    fechaNacimiento: "fechaNacimiento",
    genero: "genero",
    generoOtro: "generoOtro",
    organizacion: "organizacion",
    enlacesSociales: "enlacesSociales",
    privacidad: "privacidad",
    "tutor.nombre": "tutorNombre",
    "tutor.correo": "tutorCorreo",
    "tutor.telefono": "tutorTelefono",
    "tutor.fechaNacimiento": "tutorFechaNacimiento",
    "tutor.autorizacion": "tutorAutorizacion",
  };
  const result: ProfileFormErrors = {};
  for (const [field, message] of Object.entries(fieldErrors)) {
    const key = mapping[field] ?? (field.startsWith("enlacesSociales.") ? "enlacesSociales" : undefined);
    if (key && !result[key]) result[key] = message;
  }
  return result;
}
