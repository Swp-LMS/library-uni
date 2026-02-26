import { DataSource } from 'typeorm';
import { Book } from '../../src/modules/books/entities/Book';
import { Author } from '../../src/modules/authors/entities/Author';
import { Category } from '../../src/modules/categories/entities/Category';
import { Publisher } from '../../src/modules/publishers/entities/Publisher';

export const seedBooks = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(Book);

  const authorRepo = dataSource.getRepository(Author);
  const categoryRepo = dataSource.getRepository(Category);
  const publisherRepo = dataSource.getRepository(Publisher);

  const author = await authorRepo.findOne({ where: { name: 'J.K. Rowling' } });
  const category = await categoryRepo.findOne({ where: { name: 'Fantasy' } });
  const publisher = await publisherRepo.findOne({ where: { name: 'Bloomsbury' } });

  await repo.save([
    {
      title: 'Harry Potter and the Philosopher\'s Stone',
      author,
      category,
      publisher,
      price: 150000,
    },
  ]);

  console.log('✅ Seeded Books');
};