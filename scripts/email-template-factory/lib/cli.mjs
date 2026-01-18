/**
 * CLI argument parser
 */

export function parseArgs(args) {
  const result = {
    _: [],
    help: false,
    provider: 'anthropic',
    model: null,
    validate: false,
    validateOnly: false,  // Run validation on existing template without generation
    verbose: false,
    verify: false,
    listModels: false,
    keepTestFiles: false  // Keep validation test files for debugging
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--validate') {
      result.validate = true;
    } else if (arg === '--validate-only') {
      result.validateOnly = true;
    } else if (arg === '--keep-test-files') {
      result.keepTestFiles = true;
    } else if (arg === '--verbose' || arg === '-v') {
      result.verbose = true;
    } else if (arg === '--verify') {
      result.verify = true;
    } else if (arg === '--list-models') {
      result.listModels = true;
    } else if (arg.startsWith('--provider=')) {
      result.provider = arg.split('=')[1];
    } else if (arg.startsWith('--model=')) {
      result.model = arg.split('=')[1];
    } else if (!arg.startsWith('-')) {
      result._.push(arg);
    }
  }

  return result;
}
