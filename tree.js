const fs = require('fs');
const path = require('path');

const EXCLUDED = ['node_modules', '.git', '.expo', '.vscode', '.claude'];

function printTree(dir, prefix = '') {
  const files = fs.readdirSync(dir);
  const filtered = files.filter(f => !EXCLUDED.includes(f));

  filtered.forEach((file, index) => {
    const isLast = index === filtered.length - 1;
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    console.log(`${prefix}${isLast ? '└── ' : '├── '}${file}`);

    if (stats.isDirectory()) {
      printTree(filePath, `${prefix}${isLast ? '    ' : '│   '}`);
    }
  });
}

console.log('DocuDocente-App');
printTree('.');

//CADA VES QUE NESECITES LA ESTRUCTURA EJECUTAR EN CONSOLA LO SIGUINETE 
//node tree.js
// PERO RECORDAD QUE SE ESTA OBIANDO LA CARPETA node_module PUES CONTIENE MUCHOS ARCHIVOS PERO NO OLVIDAR AGREGARLO SI HACE FALTA AL MENOS LA CARPETA

//Si quieres guardar el resultado en un archivo ESTRUCTURA.md automáticamente, solo ejecuta=>    node tree.js > ESTRUCTURA.md
