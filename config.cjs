module.exports = {
  build: {
    templates: {
      source: 'src/templates',
      destination: {
        path: 'build_local',
      },
    },
    components: {
      source: 'src/components',
    },
  },
  server: {
    port: 3000,
  },
}