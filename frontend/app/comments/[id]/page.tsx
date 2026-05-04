'use client';

import { useParams } from 'next/navigation';

export default function Comments() {
  const params = useParams();
  const id = params.id;

  return (
    <div>
      <h1>Comentários - Item {id}</h1>
      {/* Seus comentários e formulário para comentar aqui */}
    </div>
  );
}
