import { useState } from 'react';

const covers = import.meta.glob('./assets/covers/*.jpg', {
  eager: true,
  import: 'default',
  query: '?url',
});

export default function BookCover({ book, compact = false }) {
  const src = covers[`./assets/covers/${book.isbn}.jpg`];
  const [failed, setFailed] = useState(false);

  return (
    <span className="book-cover" aria-hidden="true">
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="cover-fallback">
          {!compact && <small>{book.category || 'Book'}</small>}
          <span>{book.title}</span>
        </span>
      )}
    </span>
  );
}
