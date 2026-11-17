// Generated from regenera-api/resources/js/avatar-creator.js (SVG generation only).
// Keep in sync with the web renderer; classes and animation styles were removed.

export const AVATAR_KEYS = [
  "skin",
  "hairColor",
  "hairStyle",
  "eyeStyle",
  "eyebrowStyle",
  "noseStyle",
  "headShape",
  "earStyle",
  "bodyType",
  "outfit",
  "accessory",
] as const;

export type AvatarKey = (typeof AVATAR_KEYS)[number];
export type AvatarConfig = Record<AvatarKey, string>;

export const DEFAULT_AVATAR_STATE: AvatarConfig = {
  skin: "light",
  hairColor: "black",
  hairStyle: "short",
  eyeStyle: "round",
  eyebrowStyle: "natural",
  noseStyle: "small",
  headShape: "round",
  earStyle: "normal",
  bodyType: "classic",
  outfit: "green",
  accessory: "none",
};

let avatarState: AvatarConfig = { ...DEFAULT_AVATAR_STATE };

const skinColors: Record<string, string> = {
  light: "#F6D7C3",
  medium: "#D49A72",
  dark: "#85543D",
};

const hairColors: Record<string, string> = {
  black: "#302C2B",
  brown: "#805438",
  blonde: "#E9C66F",
};

const outfitColors: Record<string, string> = {
  green: "#91B99A",
  white: "#FFFFFF",
  pink: "#EFAEB7",
  blue: "#8FAED1",
};

function renderBody(): string {

    const skin = skinColors[avatarState.skin];
    const outfit = outfitColors[avatarState.outfit];

    let bodyShape = '';
    let leftArm = '';
    let rightArm = '';

    switch (avatarState.bodyType) {

        case 'round':

            bodyShape = `
                <path
                    d="M48 192
                       Q43 151 76 140
                       Q100 132 124 140
                       Q157 151 152 192 Z"
                    fill="${outfit}"
                    stroke="#AFAFA5"
                    stroke-width="1"
                />
            `;

            leftArm = `
                <path
                    d="M64 148 Q43 153 45 179
                       Q46 192 59 187
                       L76 156 Z"
                    fill="${skin}"
                />
            `;

            rightArm = `
                <path
                    d="M136 148 Q157 153 155 179
                       Q154 192 141 187
                       L124 156 Z"
                    fill="${skin}"
                />
            `;

            break;

        case 'slim':

            bodyShape = `
                <path
                    d="M72 192
                       Q70 153 83 141
                       Q100 134 117 141
                       Q130 153 128 192 Z"
                    fill="${outfit}"
                    stroke="#AFAFA5"
                    stroke-width="1"
                />
            `;

            leftArm = `
                <path
                    d="M79 148 Q67 157 66 181
                       Q66 188 73 188
                       Q79 188 81 180
                       L89 152 Z"
                    fill="${skin}"
                />
            `;

            rightArm = `
                <path
                    d="M121 148 Q133 157 134 181
                       Q134 188 127 188
                       Q121 188 119 180
                       L111 152 Z"
                    fill="${skin}"
                />
            `;

            break;

        case 'robust':

            bodyShape = `
                <path
                    d="M40 192
                       Q39 153 70 140
                       Q100 130 130 140
                       Q161 153 160 192 Z"
                    fill="${outfit}"
                    stroke="#AFAFA5"
                    stroke-width="1"
                />
            `;

            leftArm = `
                <path
                    d="M62 146 Q39 154 41 180
                       Q42 192 56 190
                       L77 153 Z"
                    fill="${skin}"
                />
            `;

            rightArm = `
                <path
                    d="M138 146 Q161 154 159 180
                       Q158 192 144 190
                       L123 153 Z"
                    fill="${skin}"
                />
            `;

            break;

        default:

            bodyShape = `
                <path
                    d="M55 190
                       Q55 151 78 142
                       Q100 134 122 142
                       Q145 151 145 190 Z"
                    fill="${outfit}"
                    stroke="#AFAFA5"
                    stroke-width="1"
                />
            `;

            leftArm = `
                <path
                    d="M72 149 Q58 153 53 176
                       Q51 185 59 187
                       Q67 187 69 178
                       L82 153 Z"
                    fill="${skin}"
                />
            `;

            rightArm = `
                <path
                    d="M128 149 Q142 153 147 176
                       Q149 185 141 187
                       Q133 187 131 178
                       L118 153 Z"
                    fill="${skin}"
                />
            `;
    }

    // Detalles de cada camisa.

    let shirtDetail = '';

    if (avatarState.outfit === 'green') {

        shirtDetail = `
            <path
                d="M91 153 Q100 163 109 153"
                fill="none"
                stroke="#6D9477"
                stroke-width="3"
                stroke-linecap="round"
            />

            <circle cx="100" cy="170" r="4"
                fill="#E7E5BB"/>
        `;
    }

    if (avatarState.outfit === 'white') {

        shirtDetail = `
            <path
                d="M90 153 L110 153"
                stroke="#E3E3E3"
                stroke-width="2"
            />
        `;
    }

    if (avatarState.outfit === 'pink') {

        shirtDetail = `
            <path
                d="M100 158
                   C94 150 84 157 100 171
                   C116 157 106 150 100 158 Z"
                fill="#F8D9D8"
            />
        `;
    }

    if (avatarState.outfit === 'blue') {

        shirtDetail = `
            <path
                d="M91 153 Q100 162 109 153"
                fill="none"
                stroke="#6689B2"
                stroke-width="3"
            />

            <circle cx="100" cy="170" r="3"
                fill="#D9E5F3"/>
        `;
    }

    return `
        <!-- Cuello -->
        <rect
            x="87" y="125"
            width="26" height="24"
            rx="10"
            fill="${skin}"
        />

        <!-- Brazos -->
        ${leftArm}
        ${rightArm}

        <!-- Camisa -->
        ${bodyShape}

        <!-- Decoración de la camisa -->
        ${shirtDetail}
    `;
}


/* ========================================
   4. OREJAS
======================================== */

function renderEars(): string {

    const skin = skinColors[avatarState.skin];

    switch (avatarState.earStyle) {

        case 'large':

            return `
                <g>
                    <ellipse
                        cx="49" cy="87"
                        rx="15" ry="21"
                        fill="${skin}"
                    />

                    <ellipse
                        cx="151" cy="87"
                        rx="15" ry="21"
                        fill="${skin}"
                    />

                    <ellipse
                        cx="49" cy="88"
                        rx="7" ry="12"
                        fill="#D99E91"
                        opacity="0.45"
                    />

                    <ellipse
                        cx="151" cy="88"
                        rx="7" ry="12"
                        fill="#D99E91"
                        opacity="0.45"
                    />
                </g>
            `;

        case 'elf':

            return `
                <path
                    d="M58 78
                       Q40 58 16 49
                       Q23 88 53 104 Z"
                    fill="${skin}"
                />

                <path
                    d="M142 78
                       Q160 58 184 49
                       Q177 88 147 104 Z"
                    fill="${skin}"
                />

                <path
                    d="M51 79 Q39 68 29 62"
                    stroke="#D99E91"
                    stroke-width="2"
                    fill="none"
                    opacity="0.6"
                />

                <path
                    d="M149 79 Q161 68 171 62"
                    stroke="#D99E91"
                    stroke-width="2"
                    fill="none"
                    opacity="0.6"
                />
            `;

        case 'small':

            return `
                <ellipse
                    cx="54" cy="88"
                    rx="6" ry="9"
                    fill="${skin}"
                />

                <ellipse
                    cx="146" cy="88"
                    rx="6" ry="9"
                    fill="${skin}"
                />
            `;

        default:

            return `
                <ellipse
                    cx="53" cy="87"
                    rx="10" ry="15"
                    fill="${skin}"
                />

                <ellipse
                    cx="147" cy="87"
                    rx="10" ry="15"
                    fill="${skin}"
                />

                <ellipse
                    cx="53" cy="88"
                    rx="4" ry="8"
                    fill="#D99E91"
                    opacity="0.45"
                />

                <ellipse
                    cx="147" cy="88"
                    rx="4" ry="8"
                    fill="#D99E91"
                    opacity="0.45"
                />
            `;
    }
}


/* ========================================
   5. FORMA DE CABEZA
======================================== */

function renderHead(): string {

    const skin = skinColors[avatarState.skin];

    let headShape = '';

    switch (avatarState.headShape) {

        case 'oval':

            headShape = `
                <ellipse
                    cx="100" cy="83"
                    rx="43" ry="58"
                    fill="${skin}"
                />
            `;

            break;

        case 'wide':

            headShape = `
                <ellipse
                    cx="100" cy="83"
                    rx="56" ry="49"
                    fill="${skin}"
                />
            `;

            break;

        case 'square':

            headShape = `
                <path
                    d="M55 62
                       Q55 28 100 28
                       Q145 28 145 62
                       L145 94
                       Q145 137 100 139
                       Q55 137 55 94 Z"
                    fill="${skin}"
                />
            `;

            break;

        default:

            headShape = `
                <ellipse
                    cx="100" cy="83"
                    rx="49" ry="56"
                    fill="${skin}"
                />
            `;
    }

    return `
        ${headShape}

        <!-- Mejilla izquierda -->
        <ellipse
            cx="69" cy="105"
            rx="9" ry="5"
            fill="#EFA9A5"
            opacity="0.55"
        />

        <!-- Mejilla derecha -->
        <ellipse
            cx="131" cy="105"
            rx="9" ry="5"
            fill="#EFA9A5"
            opacity="0.55"
        />
    `;
}


/* ========================================
   6. CEJAS
======================================== */

function renderEyebrows(): string {

    const color = hairColors[avatarState.hairColor];

    switch (avatarState.eyebrowStyle) {

        case 'straight':

            return `
                <g fill="none"
                    stroke="${color}"
                    stroke-width="3"
                    stroke-linecap="round">

                    <path d="M70 72 L89 72"/>
                    <path d="M111 72 L130 72"/>

                </g>
            `;

        case 'arched':

            return `
                <g fill="none"
                    stroke="${color}"
                    stroke-width="3"
                    stroke-linecap="round">

                    <path d="M70 76 Q79 63 90 73"/>
                    <path d="M110 73 Q121 63 130 76"/>

                </g>
            `;

        case 'thick':

            return `
                <g fill="${color}">

                    <path
                        d="M69 72 Q79 64 91 73
                           L90 79 Q78 73 69 77 Z"
                    />

                    <path
                        d="M109 73 Q121 64 131 72
                           L131 77 Q122 73 110 79 Z"
                    />

                </g>
            `;

        default:

            return `
                <g fill="none"
                    stroke="${color}"
                    stroke-width="2.5"
                    stroke-linecap="round">

                    <path d="M70 75 Q80 68 90 75"/>
                    <path d="M110 75 Q120 68 130 75"/>

                </g>
            `;
    }
}


/* ========================================
   7. OJOS
======================================== */

function renderEyes(): string {

    const eyeColor = '#302C2B';

    if (avatarState.eyeStyle === 'happy') {

        return `
            <g>

                <path
                    d="M70 89 Q80 77 90 89"
                    fill="none"
                    stroke="${eyeColor}"
                    stroke-width="4"
                    stroke-linecap="round"
                />

                <path
                    d="M110 89 Q120 77 130 89"
                    fill="none"
                    stroke="${eyeColor}"
                    stroke-width="4"
                    stroke-linecap="round"
                />

            </g>
        `;
    }

    if (avatarState.eyeStyle === 'star') {

        return `
            <g>

                <path
                    d="M80 76 L83 83 L91 84
                       L85 89 L87 97 L80 92
                       L73 97 L75 89 L69 84
                       L77 83 Z"
                    fill="${eyeColor}"
                />

                <path
                    d="M120 76 L123 83 L131 84
                       L125 89 L127 97 L120 92
                       L113 97 L115 89 L109 84
                       L117 83 Z"
                    fill="${eyeColor}"
                />

            </g>
        `;
    }

    return `
        <g>

            <ellipse
                cx="80" cy="87"
                rx="6.5" ry="10"
                fill="${eyeColor}"
            />

            <circle
                cx="82" cy="83"
                r="2.5"
                fill="white"
            />

            <ellipse
                cx="120" cy="87"
                rx="6.5" ry="10"
                fill="${eyeColor}"
            />

            <circle
                cx="122" cy="83"
                r="2.5"
                fill="white"
            />

        </g>
    `;
}


/* ========================================
   8. NARIZ
======================================== */

function renderNose(): string {

    switch (avatarState.noseStyle) {

        case 'triangle':

            return `
                <path
                    d="M100 99 L96 105 Q100 109 104 105 Z"
                    fill="#D79E8D"
                />
            `;

        case 'soft':

            return `
                <path
                    d="M100 97
                       Q94 105 100 108
                       Q106 105 100 97 Z"
                    fill="#D79E8D"
                    opacity="0.85"
                />
            `;

        case 'none':

            return '';

        default:

            return `
                <ellipse
                    cx="100" cy="103"
                    rx="2.5" ry="2"
                    fill="#D79E8D"
                />
            `;
    }
}


/* ========================================
   9. BOCA
======================================== */

function renderMouth(): string {

    return `
        <path
            d="M92 113 Q100 121 108 113"
            fill="none"
            stroke="#A76561"
            stroke-width="2"
            stroke-linecap="round"
        />
    `;
}


/* ========================================
   10. CABELLO POSTERIOR
======================================== */

function renderHairBack(): string {

    const hair = hairColors[avatarState.hairColor];

    switch (avatarState.hairStyle) {

        case 'long':

            return `
                <path
                    d="M48 83
                       Q40 22 100 23
                       Q160 22 152 83
                       L153 151
                       Q142 165 132 147
                       L128 116 L72 116
                       L68 147
                       Q58 165 47 151 Z"
                    fill="${hair}"
                />
            `;

        case 'bob':

            return `
                <path
                    d="M48 82
                       Q40 25 100 25
                       Q160 25 152 82
                       L151 130
                       Q140 148 125 127
                       L75 127
                       Q60 148 49 130 Z"
                    fill="${hair}"
                />
            `;

        case 'curly':

            return `
                <path
                    d="M50 90
                       Q37 65 48 45
                       Q43 20 67 25
                       Q79 10 96 25
                       Q120 8 136 27
                       Q162 29 151 58
                       Q166 78 149 99
                       L145 122
                       L55 122 Z"
                    fill="${hair}"
                />

                <circle cx="53" cy="65" r="14" fill="${hair}"/>
                <circle cx="67" cy="35" r="13" fill="${hair}"/>
                <circle cx="100" cy="26" r="15" fill="${hair}"/>
                <circle cx="133" cy="37" r="15" fill="${hair}"/>
                <circle cx="150" cy="69" r="13" fill="${hair}"/>
            `;

        default:

            return `
                <path
                    d="M49 84
                       Q43 24 100 25
                       Q157 24 151 84
                       L145 119
                       Q137 131 125 122
                       L75 122
                       Q63 131 55 119 Z"
                    fill="${hair}"
                />
            `;
    }
}


/* ========================================
   11. CABELLO FRONTAL
======================================== */

function renderHair(): string {

    const hair = hairColors[avatarState.hairColor];

    let design = '';

    switch (avatarState.hairStyle) {

        case 'long':

            design = `
                <path
                    d="M52 78
                       Q43 30 87 25
                       Q130 12 147 52
                       Q155 68 148 84
                       Q132 65 125 56
                       Q110 78 99 65
                       Q80 81 68 67
                       Q59 82 52 78 Z"
                    fill="${hair}"
                />
            `;

            break;

        case 'bob':

            design = `
                <path
                    d="M51 79
                       Q46 29 100 27
                       Q153 27 149 79
                       Q130 66 124 56
                       Q112 75 98 66
                       Q81 81 69 67
                       Q59 81 51 79 Z"
                    fill="${hair}"
                />
            `;

            break;

        case 'curly':

            design = `
                <path
                    d="M51 80
                       Q43 43 71 30
                       Q100 12 128 31
                       Q155 42 149 80
                       Q133 65 126 61
                       Q112 77 99 65
                       Q83 80 70 65 Z"
                    fill="${hair}"
                />

                <circle cx="62" cy="54" r="12" fill="${hair}"/>
                <circle cx="80" cy="34" r="13" fill="${hair}"/>
                <circle cx="105" cy="29" r="13" fill="${hair}"/>
                <circle cx="130" cy="43" r="13" fill="${hair}"/>
                <circle cx="143" cy="65" r="11" fill="${hair}"/>
            `;

            break;

        default:

            design = `
                <path
                    d="M51 78
                       Q47 31 85 29
                       Q112 14 139 43
                       Q153 58 148 83
                       Q137 70 128 65
                       Q118 82 101 72
                       Q85 86 72 72
                       Q61 84 51 78 Z"
                    fill="${hair}"
                />

                <path
                    d="M74 42
                       Q91 25 111 38
                       Q119 45 117 58
                       Q104 48 92 55
                       Q83 60 74 42 Z"
                    fill="${hair}"
                />
            `;
    }

    return `
        <g>
            ${design}
        </g>
    `;
}


/* ========================================
   12. ACCESORIOS
======================================== */

function renderAccessory(): string {

    if (avatarState.accessory === 'hat') {

        return `
            <g>

                <path
                    d="M53 49
                       Q57 19 100 19
                       Q143 19 147 49
                       Q100 57 53 49 Z"
                    fill="#B78A55"
                    stroke="#8D693D"
                    stroke-width="2"
                />

                <path
                    d="M44 49
                       Q100 38 156 49
                       Q149 62 100 62
                       Q51 62 44 49 Z"
                    fill="#D0A66D"
                    stroke="#8D693D"
                    stroke-width="2"
                />

                <path
                    d="M58 43 Q100 51 142 43"
                    fill="none"
                    stroke="#F0D5A9"
                    stroke-width="4"
                />

            </g>
        `;
    }

    if (avatarState.accessory === 'sunglasses') {

        return `
            <g
                stroke="#302C2B"
                stroke-width="3">

                <rect x="68" y="78"
                    width="23" height="17"
                    rx="5" fill="#536C70"/>

                <rect x="109" y="78"
                    width="23" height="17"
                    rx="5" fill="#536C70"/>

                <path d="M91 84 Q100 79 109 84"
                    fill="none"/>

                <path d="M68 84 L61 81"
                    fill="none"/>

                <path d="M132 84 L139 81"
                    fill="none"/>

                <path d="M73 81 L79 81"
                    stroke="white" stroke-width="2"/>

                <path d="M114 81 L120 81"
                    stroke="white" stroke-width="2"/>

            </g>
        `;
    }

    if (avatarState.accessory === 'mangrove-leaf') {
        return `
            <g stroke="#285f49" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M68 154c0-10 8-16 19-16-1 11-7 18-19 16Z" fill="#7bab75"/>
                <path d="M69 153l13-11" fill="none"/>
            </g>
        `;
    }

    if (avatarState.accessory === 'recycling-badge') {
        return `
            <g stroke="#285f49" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="128" cy="169" r="11" fill="#e2ead7"/>
                <path d="m126 162 3 1-1 3m4 0 2 2-3 1m-2 2-2 2-1-3m-1-4-2 1 1 3" fill="none"/>
            </g>
        `;
    }

    if (avatarState.accessory === 'organizer-vest') {
        return `
            <g stroke="#285f49" stroke-width="1.5" stroke-linejoin="round">
                <path d="m79 144 11 7 10-2 10 2 11-7 7 11-7 6v28H79v-28l-7-6 7-11Z" fill="#d5a64f"/>
                <path d="m90 151 10 11 10-11m-10 11v25m-15-12h8m24 0h-8" fill="none"/>
            </g>
        `;
    }

    return '';
}


/* ========================================
   13. RENDERIZAR AVATAR COMPLETO
======================================== */

function buildAvatarSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><g>${renderBody()}${renderHairBack()}${renderEars()}${renderHead()}${renderEyebrows()}${renderEyes()}${renderNose()}${renderMouth()}${renderHair()}${renderAccessory()}</g></svg>`;
}

export function renderAvatarMarkup(configuration: Partial<Record<string, string>> = {}): string {
  const previousState = avatarState;
  const merged: Record<string, string> = { ...DEFAULT_AVATAR_STATE };
  for (const [key, value] of Object.entries(configuration)) {
    if (typeof value === "string") merged[key] = value;
  }
  avatarState = merged as AvatarConfig;
  try {
    return buildAvatarSvg();
  } finally {
    avatarState = previousState;
  }
}
