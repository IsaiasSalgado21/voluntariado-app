# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Configure the Regenera API by copying `.env.example` to `.env` and setting
   `EXPO_PUBLIC_REGENERA_API_URL` to the Laravel server base URL, without `/api`.
   For a physical phone, use the computer's LAN IP and make Laravel reachable
   on the local network.

3. Start the app

   ```bash
   npx expo start
   ```

4. Run the tests

   ```bash
   npm test
   ```

The map uses the public `GET /api/v1/mapa/lugares` endpoint and displays active
places with valid coordinates, including their name, type, municipality, and
description when available. It does not display demonstration polygons or
activities. The volunteer list and details use the public
`/api/v1/mapa/voluntariados` endpoint and `/api/v1/mapa/lugares` for place
filters; unpublished activities and records without map coordinates are not
shown. Volunteer images are returned as API-served URLs and displayed in list
cards and details. Search remains visible while category, place, date, and
capacity filters can be expanded only when needed.

The Flora y fauna catalog uses the public `GET /api/flora-fauna` endpoint and
shows published records, including the habitat, conservation status, and images
provided by the API. Search and type filters are applied locally. Sensitive
species locations remain generalized as returned by the API.

The Artículos section is opened from Más and uses the public `GET /api/articulos`
and `GET /api/articulos/{id}` endpoints. It displays only published articles,
with local search and category filters. Draft and pending articles are rejected
by the app's response parser and remain protected by the API authorization policy.

Mi perfil uses the existing `POST /api/auth/login`, `POST /api/auth/register`,
`GET /api/auth/me`, and `POST /api/auth/logout` endpoints. On iOS and Android,
the Sanctum bearer token is stored with Expo SecureStore; web keeps it in memory
only. Profile data is read-only because the API does not expose a self-service
profile update route. Editing users remains an admin-only API operation.

The volunteer detail screen uses the authenticated enrollment endpoints:
`POST /api/inscripciones`, `GET /api/inscripciones/voluntariado/{id}/mia`, and
`POST /api/inscripciones/{id}/cancelar`. The app also shows the signed-in user's
enrollments from `GET /api/inscripciones`; the API remains responsible for role,
account, availability, and cancellation checks.

The notification inbox uses `GET /api/notificaciones`,
`PATCH /api/notificaciones/{id}/leida`, and
`PATCH /api/notificaciones/marcar-todas-leidas`. The API implements push as
Web Push subscriptions (`endpoint`, `keys.p256dh`, and `keys.auth`); native Expo
push uses a different token contract, so this app currently provides the
in-app inbox but does not claim to enable native push.

The role-based dashboard loads summaries from the API. Volunteers can open
their enrollments and notification inbox; organizers can list only their
managed activities, create or edit an activity, inspect its participant
dashboard, enable its attendance QR, and register attendance manually.
Administrators can manage accounts, review activities and articles, publish or
archive flora/fauna and places, and inspect audit entries. The API remains the
authority for authorization, ownership, activity status, enrollment, and
attendance time-window checks.

The attendance QR scanner requests camera access on iOS and Android. A
development build must be rebuilt after adding the `expo-camera` config plugin;
Expo Go uses the native camera module already included in Expo Go. Native
push notifications are still not included because the API only exposes Web
Push subscriptions.

For browser-based development checks, run `npx expo start --web`. Native map
and date/time picker modules are loaded only on iOS and Android; on web, the
map tab lists places with links to OpenStreetMap and activity dates/times can
be entered as text. This is a lightweight development fallback, not a web
deployment target.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **example** directory and create a blank **src/app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
