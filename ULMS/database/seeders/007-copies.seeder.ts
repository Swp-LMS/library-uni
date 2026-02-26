import { DataSource } from 'typeorm';
import { Copy } from '../../src/modules/copies/entities/Copy';
import { Book } from '../../src/modules/books/entities/Book';

export const seedCopies = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(Copy);
  const bookRepo = dataSource.getRepository(Book);

  const book = await bookRepo.findOne({
    where: { title: "Harry Potter and the Philosopher's Stone" },
  });

  // 🛑 Nếu không tìm thấy book → dừng seed để tránh lỗi null
  if (!book) {
    console.log('⚠️ Book not found. Skipping copies seed.');
    return;
  }

  const copies = Array.from({ length: 5 }).map((_, i) => ({
    book, // ✅ chắc chắn không null
    barcode: `HP-${i + 1}`,
    location: 'Shelf A',
  }));

  await repo.save(copies);
  console.log('✅ Seeded Copies');
};