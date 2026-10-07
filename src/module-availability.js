// Remove a module from this list when its lesson is ready to be released.
export const modulesUnderDevelopment = Object.freeze({
  model3d: '2D ke 3D',
  lkpd: 'Lembar Kerja',
  diagnostik: 'Tes Diagnostik',
  quiz: 'Tes Pemahaman'
});

export const isModuleLocked = id => Object.hasOwn(modulesUnderDevelopment, id);
