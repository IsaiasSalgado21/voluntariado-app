import { Text, View } from "react-native";
import { ChoiceGroup, DateField, FormField, SwitchField, type ThemeColors } from "@/features/auth/form-controls";
import {
  GENDER_OPTIONS,
  isMinor,
  type ProfileFormErrors,
  type ProfileFormValues,
} from "@/features/auth/profile";

type Patch = Partial<ProfileFormValues>;

export function ProfileFields({
  values,
  errors,
  colors,
  onChange,
  role,
  includeBirthDate = true,
  includeOptional = false,
}: {
  values: ProfileFormValues;
  errors: ProfileFormErrors;
  colors: ThemeColors;
  onChange: (patch: Patch) => void;
  role?: string;
  includeBirthDate?: boolean;
  includeOptional?: boolean;
}) {
  const minor = isMinor(values.fechaNacimiento);

  return (
    <View style={{ gap: 14 }}>
      {includeBirthDate && (
        <DateField
          label="Fecha de nacimiento"
          value={values.fechaNacimiento}
          onChange={(fechaNacimiento) => onChange({ fechaNacimiento })}
          error={errors.fechaNacimiento}
          colors={colors}
          defaultDate={new Date(2000, 0, 1)}
        />
      )}
      <FormField
        label="Ciudad"
        value={values.ciudad}
        onChangeText={(ciudad) => onChange({ ciudad })}
        error={errors.ciudad}
        colors={colors}
        placeholder="La Paz"
        autoCapitalize="words"
        maxLength={150}
      />
      <ChoiceGroup
        label="Género"
        options={GENDER_OPTIONS}
        value={values.genero}
        onChange={(genero) => onChange({ genero })}
        error={errors.genero}
        colors={colors}
      />
      {values.genero === "otro" && (
        <FormField
          label="Especifica tu género (opcional)"
          value={values.generoOtro}
          onChangeText={(generoOtro) => onChange({ generoOtro })}
          error={errors.generoOtro}
          colors={colors}
          maxLength={100}
        />
      )}
      <FormField
        label="Correo secundario"
        value={values.correoSecundario}
        onChangeText={(correoSecundario) => onChange({ correoSecundario })}
        error={errors.correoSecundario}
        hint="Debe ser distinto del correo principal y no estar asociado a otra cuenta."
        colors={colors}
        placeholder="respaldo@correo.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />

      {includeOptional && (
        <>
          <FormField
            label="Teléfono (opcional)"
            value={values.telefono}
            onChangeText={(telefono) => onChange({ telefono })}
            error={errors.telefono}
            hint="Con lada internacional, por ejemplo +52. Sin lada se asume México (10 dígitos)."
            colors={colors}
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={40}
          />
          <FormField
            label="Descripción (opcional)"
            value={values.descripcion}
            onChangeText={(descripcion) => onChange({ descripcion })}
            error={errors.descripcion}
            colors={colors}
            multiline
            maxLength={1000}
          />
          {role === "organizador" && (
            <>
              <FormField
                label="Organización"
                value={values.organizacion}
                onChangeText={(organizacion) => onChange({ organizacion })}
                error={errors.organizacion}
                colors={colors}
                maxLength={150}
              />
              <FormField
                label="Enlaces sociales"
                value={values.enlacesSociales}
                onChangeText={(enlacesSociales) => onChange({ enlacesSociales })}
                error={errors.enlacesSociales}
                hint="Uno por línea, hasta 5, con http:// o https://."
                colors={colors}
                multiline
                autoCapitalize="none"
                keyboardType="url"
              />
            </>
          )}
          <SwitchField
            label="Perfil privado"
            description={minor
              ? "Es obligatorio para personas de 13 a 17 años."
              : "Oculta tu descripción y datos adicionales en tu perfil público."}
            value={minor ? true : values.privacidad}
            disabled={minor}
            onChange={(privacidad) => onChange({ privacidad })}
            error={errors.privacidad}
            colors={colors}
          />
        </>
      )}

      {minor && (
        <View style={{ gap: 14 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>Datos de tu tutor</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>
            Por tu edad necesitamos los datos de una persona adulta responsable. No se verifica ni vincula su cuenta.
          </Text>
          <FormField
            label="Nombre del tutor"
            value={values.tutorNombre}
            onChangeText={(tutorNombre) => onChange({ tutorNombre })}
            error={errors.tutorNombre}
            colors={colors}
            autoCapitalize="words"
            maxLength={150}
          />
          <FormField
            label="Correo del tutor"
            value={values.tutorCorreo}
            onChangeText={(tutorCorreo) => onChange({ tutorCorreo })}
            error={errors.tutorCorreo}
            colors={colors}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <FormField
            label="Teléfono del tutor"
            value={values.tutorTelefono}
            onChangeText={(tutorTelefono) => onChange({ tutorTelefono })}
            error={errors.tutorTelefono}
            colors={colors}
            keyboardType="phone-pad"
            maxLength={40}
          />
          <DateField
            label="Fecha de nacimiento del tutor"
            value={values.tutorFechaNacimiento}
            onChange={(tutorFechaNacimiento) => onChange({ tutorFechaNacimiento })}
            error={errors.tutorFechaNacimiento}
            colors={colors}
            defaultDate={new Date(1980, 0, 1)}
          />
          <SwitchField
            label="Cuento con la autorización de mi tutor"
            value={values.tutorAutorizacion}
            onChange={(tutorAutorizacion) => onChange({ tutorAutorizacion })}
            error={errors.tutorAutorizacion}
            colors={colors}
          />
        </View>
      )}
    </View>
  );
}
