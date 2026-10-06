const fs = require('fs');
const path = require('path');

const b64 = fs.readFileSync(path.join(__dirname, '../public/images/logo-thumb.jpg')).toString('base64');

// Athletic Volleyball Player Placeholder
const playerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="100%" height="100%">
  <defs>
    <!-- Background Gradients -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#242428"/>
      <stop offset="45%" stop-color="#18181b"/>
      <stop offset="100%" stop-color="#0f0f11"/>
    </linearGradient>
    <radialGradient id="haloGlow" cx="50%" cy="30%" r="50%">
      <stop offset="0%" stop-color="#d90429" stop-opacity="0.22"/>
      <stop offset="60%" stop-color="#d90429" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#0f0f11" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="jerseyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2c2c33"/>
      <stop offset="50%" stop-color="#202025"/>
      <stop offset="100%" stop-color="#17171a"/>
    </linearGradient>
    <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#323238"/>
      <stop offset="50%" stop-color="#26262c"/>
      <stop offset="100%" stop-color="#1d1d21"/>
    </linearGradient>
    <linearGradient id="shortsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1d1d22"/>
      <stop offset="100%" stop-color="#111114"/>
    </linearGradient>
    
    <!-- Clip path for circular chest logo -->
    <clipPath id="badgeClip">
      <circle cx="200" cy="235" r="27" />
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="400" height="500" fill="url(#bgGrad)"/>
  <rect width="400" height="500" fill="url(#haloGlow)"/>

  <!-- Subtle volleyball net / court lines watermark in background -->
  <g stroke="#26262c" stroke-width="1.2" opacity="0.65">
    <line x1="50" y1="0" x2="50" y2="500" stroke-dasharray="3 5"/>
    <line x1="350" y1="0" x2="350" y2="500" stroke-dasharray="3 5"/>
    <line x1="0" y1="330" x2="400" y2="330" stroke-width="1.5" stroke="#32323a"/>
  </g>

  <!-- ================= ATHLETIC VOLLEYBALL PLAYER SILHOUETTE ================= -->

  <!-- 1. Head & Athletic Neck -->
  <g id="head-neck">
    <!-- Neck & Trapezius muscles sloping into athletic broad shoulders -->
    <path d="M 184 130 L 184 165 C 152 168 126 178 110 188 L 138 200 L 178 180 L 222 180 L 262 200 L 290 188 C 274 178 248 168 216 165 L 216 130 Z" 
          fill="url(#skinGrad)" stroke="#383840" stroke-width="1.2"/>
    <!-- Athletic Head Oval -->
    <ellipse cx="200" cy="100" rx="31" ry="38" fill="url(#skinGrad)" stroke="#42424b" stroke-width="1.4"/>
    <!-- Athletic haircut contour -->
    <path d="M 171 100 C 169 78 182 64 200 64 C 218 64 231 78 229 100 C 220 86 210 80 200 80 C 190 80 180 86 171 100 Z" 
          fill="#131316"/>
  </g>

  <!-- 2. Muscular Arms & Hands (Natural Athletic Ready/Vigorous Stance) -->
  <g id="arms" fill="url(#skinGrad)" stroke="#383842" stroke-width="1.2">
    <!-- LEFT ARM: Broad Deltoid -> Bicep/Tricep -> Forearm -> Athletic Hand -->
    <path d="M 110 188 
             C 98 198 90 220 88 248 
             C 86 275 88 305 92 330 
             C 96 355 102 385 110 415 
             C 114 430 119 444 125 450 
             C 130 450 134 442 135 430 
             C 132 410 126 370 124 335 
             C 122 305 126 278 131 254 
             L 138 200 Z" />
    <!-- Left Hand Thumb and fingers -->
    <path d="M 110 415 C 107 430 112 452 120 458 C 126 458 130 445 130 430" fill="#202026" stroke="#3b3b45"/>

    <!-- RIGHT ARM: Broad Deltoid -> Bicep/Tricep -> Forearm -> Athletic Hand -->
    <path d="M 290 188 
             C 302 198 310 220 312 248 
             C 314 275 312 305 308 330 
             C 304 355 298 385 290 415 
             C 286 430 281 444 275 450 
             C 270 450 266 442 265 430 
             C 268 410 274 370 276 335 
             C 278 305 274 278 269 254 
             L 262 200 Z" />
    <!-- Right Hand Thumb and fingers -->
    <path d="M 290 415 C 293 430 288 452 280 458 C 274 458 270 445 270 430" fill="#202026" stroke="#3b3b45"/>
  </g>

  <!-- 3. Legs / Muscular Quads visible below shorts -->
  <g id="legs" fill="url(#skinGrad)" stroke="#32323a" stroke-width="1.2">
    <!-- Left Leg Quad -->
    <path d="M 148 410 L 144 500 L 188 500 L 192 410 Z"/>
    <!-- Right Leg Quad -->
    <path d="M 208 410 L 212 500 L 256 500 L 252 410 Z"/>
  </g>

  <!-- 4. Athletic Volleyball Shorts -->
  <g id="shorts">
    <!-- Shorts body -->
    <path d="M 158 322 
             L 242 322 
             L 256 414 
             L 208 414 
             L 200 365 
             L 192 414 
             L 144 414 Z" 
          fill="url(#shortsGrad)" stroke="#3e3e48" stroke-width="1.4"/>
    <!-- Red Side Trim Bands on Shorts -->
    <path d="M 158 322 L 144 414 L 149 414 L 162 322 Z" fill="#d90429" opacity="0.9"/>
    <path d="M 242 322 L 256 414 L 251 414 L 238 322 Z" fill="#d90429" opacity="0.9"/>
    <!-- Shorts hems -->
    <line x1="144" y1="410" x2="192" y2="410" stroke="#484854" stroke-width="1.6"/>
    <line x1="208" y1="410" x2="256" y2="410" stroke="#484854" stroke-width="1.6"/>
  </g>

  <!-- 5. Athletic Torso & Jersey (V-Taper: Broad chest down to lean waist) -->
  <g id="jersey">
    <!-- Main Jersey Body (V-Taper) -->
    <path d="M 124 186 
             C 120 220 132 260 148 290 
             L 158 324 
             L 242 324 
             L 252 290 
             C 268 260 280 220 276 186 
             L 226 180 
             L 200 204 
             L 174 180 Z" 
          fill="url(#jerseyGrad)" stroke="#454550" stroke-width="1.6"/>

    <!-- Crimson Athletic Side Panels -->
    <path d="M 124 186 C 120 220 132 260 148 290 L 158 324 L 152 324 C 138 290 128 250 132 205 Z" fill="#d90429" opacity="0.9"/>
    <path d="M 276 186 C 280 220 268 260 252 290 L 242 324 L 248 324 C 262 290 272 250 268 205 Z" fill="#d90429" opacity="0.9"/>

    <!-- Modern V-Neck Collar with Crimson & White Trim -->
    <path d="M 174 180 L 200 206 L 226 180" fill="none" stroke="#d90429" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M 176 178 L 200 202 L 224 178" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="0.85"/>

    <!-- Subtle Athletic Pectoral accents -->
    <path d="M 158 245 Q 178 255 194 250" stroke="#2b2b32" stroke-width="1.4" fill="none"/>
    <path d="M 242 245 Q 222 255 206 250" stroke="#2b2b32" stroke-width="1.4" fill="none"/>
  </g>

  <!-- 6. Official Club Crest Badge on the Chest -->
  <g id="club-crest">
    <!-- Crest Outer Glow -->
    <circle cx="200" cy="235" r="32" fill="#000000" opacity="0.5"/>
    <!-- Crest White Circular Badge Base with Crimson Border -->
    <circle cx="200" cy="235" r="29" fill="#ffffff" stroke="#d90429" stroke-width="3"/>
    <!-- Embedded Official C.D. Voleibol San Pedro Logo -->
    <image href="data:image/jpeg;base64,${b64}" 
           x="171" y="210" width="58" height="50" 
           preserveAspectRatio="xMidYMid meet" 
           clip-path="url(#badgeClip)"/>
    <!-- Subtle Inner Border -->
    <circle cx="200" cy="235" r="27" fill="none" stroke="#222222" stroke-width="1" opacity="0.3"/>
  </g>
</svg>`;

// Staff Placeholder (Coach / Physio athletic polo/tracksuit silhouette with club crest)
const staffSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGradStaff" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#242428"/>
      <stop offset="45%" stop-color="#18181b"/>
      <stop offset="100%" stop-color="#0f0f11"/>
    </linearGradient>
    <radialGradient id="staffGlow" cx="50%" cy="30%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#0f0f11" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="poloGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#242429"/>
      <stop offset="50%" stop-color="#1a1a1e"/>
      <stop offset="100%" stop-color="#121215"/>
    </linearGradient>
    <linearGradient id="staffSkin" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#323238"/>
      <stop offset="50%" stop-color="#26262c"/>
      <stop offset="100%" stop-color="#1d1d21"/>
    </linearGradient>
    <clipPath id="staffBadgeClip">
      <circle cx="200" cy="238" r="27" />
    </clipPath>
  </defs>

  <rect width="400" height="500" fill="url(#bgGradStaff)"/>
  <rect width="400" height="500" fill="url(#staffGlow)"/>

  <!-- Head & Neck -->
  <path d="M 184 130 L 184 165 C 152 168 126 178 110 188 L 138 200 L 178 180 L 222 180 L 262 200 L 290 188 C 274 178 248 168 216 165 L 216 130 Z" 
        fill="url(#staffSkin)" stroke="#383840" stroke-width="1.2"/>
  <ellipse cx="200" cy="100" rx="31" ry="38" fill="url(#staffSkin)" stroke="#42424b" stroke-width="1.4"/>
  <path d="M 171 100 C 169 78 182 64 200 64 C 218 64 231 78 229 100 C 220 86 210 80 200 80 C 190 80 180 86 171 100 Z" fill="#131316"/>

  <!-- Arms -->
  <g fill="url(#staffSkin)" stroke="#383842" stroke-width="1.2">
    <path d="M 110 188 C 98 198 90 220 88 248 C 86 275 88 305 92 330 C 96 355 102 385 110 415 C 114 430 119 444 125 450 C 130 450 134 442 135 430 C 132 410 126 370 124 335 C 122 305 126 278 131 254 L 138 200 Z" />
    <path d="M 290 188 C 302 198 310 220 312 248 C 314 275 312 305 308 330 C 304 355 298 385 290 415 C 286 430 281 444 275 450 C 270 450 266 442 265 430 C 268 410 274 370 276 335 C 278 305 274 278 269 254 L 262 200 Z" />
  </g>

  <!-- Coach / Staff Tracksuit / Polo -->
  <path d="M 124 186 C 120 220 132 260 148 290 L 154 380 L 246 380 L 252 290 C 268 260 280 220 276 186 L 226 180 L 200 196 L 174 180 Z" 
        fill="url(#poloGrad)" stroke="#454550" stroke-width="1.6"/>
  <!-- Polo Collar -->
  <path d="M 174 180 L 195 204 L 205 204 L 226 180" fill="#1b1b20" stroke="#d90429" stroke-width="2"/>
  <!-- Trousers base -->
  <path d="M 154 380 L 246 380 L 250 500 L 210 500 L 200 440 L 190 500 L 150 500 Z" fill="#101013" stroke="#252528" stroke-width="1.2"/>

  <!-- Club Crest Badge -->
  <g id="staff-crest">
    <circle cx="200" cy="238" r="32" fill="#000000" opacity="0.5"/>
    <circle cx="200" cy="238" r="29" fill="#ffffff" stroke="#d90429" stroke-width="3"/>
    <image href="data:image/jpeg;base64,${b64}" 
           x="171" y="213" width="58" height="50" 
           preserveAspectRatio="xMidYMid meet" 
           clip-path="url(#staffBadgeClip)"/>
  </g>
</svg>`;

fs.writeFileSync(path.join(__dirname, '../public/images/player-placeholder.svg'), playerSvg);
fs.writeFileSync(path.join(__dirname, '../public/images/staff-placeholder.svg'), staffSvg);
console.log('SVGs created successfully with athletic proportions and official club crest!');
