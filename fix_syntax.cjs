const fs = require('fs');
let code = fs.readFileSync('src/components/MisAsignaciones.tsx', 'utf8');
code = code.replace(/\\`/g, '`');
code = code.replace(/\\\$/g, '$');
fs.writeFileSync('src/components/MisAsignaciones.tsx', code);
