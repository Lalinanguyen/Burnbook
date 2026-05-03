import React, { useState, useEffect } from 'react';
import { localStorage as db } from '../../shared/storage/LocalDB';
import { Book } from '../../shared/types';
import ThreeBookshelf from './ThreeBookshelf';
import NewBookForm from './NewBookForm';

interface BookshelfProps {
  onSelectBook: (book: Book) => void;
}

export default function Bookshelf({ onSelectBook }: BookshelfProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    const all = await db.getAllBooks();
    setBooks(all);
  };

  const handleBookCreated = () => {
    setShowForm(false);
    loadBooks();
  };

  return (
    <>
      <ThreeBookshelf
        books={books}
        onSelectBook={onSelectBook}
        onCreateBook={() => setShowForm(true)}
      />
      {showForm && (
        <NewBookForm
          onClose={() => setShowForm(false)}
          onSave={handleBookCreated}
        />
      )}
    </>
  );
}
