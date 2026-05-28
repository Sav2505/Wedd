import React, { useMemo } from 'react';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';

const rtlCache = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

interface Props {
  children: React.ReactNode;
}

export default function RtlProvider({ children }: Props) {
  const cache = useMemo(() => rtlCache, []);
  return <CacheProvider value={cache}>{children}</CacheProvider>;
}
