import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';


import Content from 'pages/interface/components/Content/index';


vi.mock('@primer/react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    LabelGroup: ({ children }) => <div data-testid="label-group">{children}</div>,
  };
});


vi.mock('@/TabNewsUI', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Viewer: ({ value }) => <div id="viewer-output">{value}</div>,
  };
});


vi.mock('../pages/interface', () => ({
  useUser: () => ({ user: { id: 1, username: 'testuser' } }),
  createErrorMessage: vi.fn(),
  isValidJsonString: vi.fn(),
  processNdJsonStream: vi.fn(),
}));


const mockContent = {
  title: 'Título Nativo do Post',
  owner_username: 'testuser',
  slug: 'post-slug',
  body: '# Meu Título H1\n\nIsso deveria ser um H2.',
  parent_id: null,
  published_at: new Date().toISOString(),
};


test('title_markdown_h1_conversion: O H1 do corpo deve ser rebaixado para H2 se houver título nativo', () => {
  const htmlString = renderToStaticMarkup(<Content content={mockContent} mode="view" isPageRootOwner={true} />);


  expect(htmlString).toContain('<div id="viewer-output">## Meu Título H1');
  expect(htmlString).not.toContain('<div id="viewer-output"># Meu Título H1');
});
