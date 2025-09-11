const { db } = require('./db');
const { products } = require('./db/schema');

async function checkPdfs() {
  try {
    const rows = await db.select().from(products);
    console.log('Products with PDF info:');
    rows.forEach(p => {
      if (p.pdf_file || p.pdf_data) {
        console.log(`ID: ${p.id}, Name: ${p.name}, pdf_file: ${p.pdf_file}, has pdf_data: ${!!p.pdf_data}`);
      }
    });
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkPdfs();
