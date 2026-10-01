// SVG ids are document-global. Each <IslamabadSky> gets its own prefix so two
// instances on one page don't share gradients (which would also share the
// colours of whichever instance's DOM defined them first).

import { createContext, useContext } from 'react'

const IdPrefix = createContext('isky')

export const IdPrefixProvider = IdPrefix.Provider

export function useSvgIds() {
  const prefix = useContext(IdPrefix)
  return {
    id: (name: string) => `${prefix}-${name}`,
    url: (name: string) => `url(#${prefix}-${name})`,
    href: (name: string) => `#${prefix}-${name}`,
  }
}
