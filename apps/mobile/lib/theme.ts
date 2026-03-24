const sharedColors = {
  accent: '#cb4b16',
  accentHover: '#d45d1e',
  accentAlt: '#b58900',
  heading: '#2aa198',
  brand: '#ff7700',
  danger: '#dc322f',
}

export const darkColors = {
  ...sharedColors,
  bg: '#1d2024',
  surface: '#27292e',
  border: '#586e75',
  text: '#93a1a1',
  textStrong: '#eee8d5',
  muted: '#839496',
}

export const lightColors = {
  ...sharedColors,
  bg: '#fdf3d8',
  surface: '#ede8d0',
  border: '#93a1a1',
  text: '#586e75',
  textStrong: '#073642',
  muted: '#657b83',
}

// Convenience type for resolved colors object
export type AppColors = typeof darkColors

export const font = {
  regular: 'CourierPrime_400Regular',
  bold: 'CourierPrime_700Bold',
  italicRegular: 'CourierPrime_400Regular_Italic',
  italicBold: 'CourierPrime_700Bold_Italic',
}
