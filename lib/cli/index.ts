require('colorful').colorful();
import * as fs from 'fs';
import * as path from 'path';
import * as program from 'commander';
import { genSDK, genFromUrl, genFromData, CliConfig } from '../';
let packageInfo = require('../../package.json');

program.version(packageInfo.version);

function addCommonParam(command: program.Command) {
  return command
    .option('-d, --sdkDir <sdkDir>', 'sdkDir, default: process.cwd()/service')
    .option('-t, --templatePath <templatePath>', 'templatePath')
    .option('-t, --type <type>', 'ts/js, default ts', /^(ts|js)$/i)
    .option(
      '-c, --camelCase <camelCase>',
      'filename style, true 为大驼峰，lower 为小驼峰',
      /^(true|lower)$/i
    );
}

const defaultOpt: CliConfig = {
  sdkDir: `${process.cwd()}/service`,
  type: 'ts',
};

addCommonParam(program)
  .command('url <url>')
  .description('swagger2/oas3 json data url')
  .action(function(url, opt) {
    const { sdkDir, type, camelCase, templatePath } = opt;
    if (!url) {
      console.error('[GenSDK] err NEED Url');
      return;
    }
    genFromUrl({
      api: url,
      sdkDir: sdkDir || defaultOpt.sdkDir,
      templatePath,
      type: type || defaultOpt.type,
      camelCase: camelCase === 'true' ? true : camelCase,
    })
      .then(_ => process.exit(0))
      .catch(error => console.log('[GenSDK] err:\n', error));
  });

addCommonParam(program)
  .command('data <filePath>')
  .description('swagger2/oas3 json data file')
  .action(function(filePath, opt) {
    filePath = !path.isAbsolute(filePath) ? path.join(process.cwd(), filePath) : filePath;

    const { sdkDir, type, camelCase, templatePath } = opt;
    if (!filePath || !fs.existsSync(filePath)) {
      console.error('[GenSDK] err NEED Data file:', filePath);
      return;
    }
    let data: any;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (error) {
      console.error('[GenSDK] file load fail.', error);
      process.exit(-1);
    }
    genFromData(
      {
        ...defaultOpt,
        sdkDir: sdkDir || defaultOpt.sdkDir,
        templatePath,
        type: type || defaultOpt.type,
        camelCase: camelCase === 'true' ? true : camelCase,
      },
      data
    )
      .then(_ => process.exit(0))
      .catch(error => console.log('[GenSDK] err:\n', error));
  });

program
  .command('config <cfgPath>')
  .description('config path')
  .action(function(cfgPath) {
    if (!cfgPath) {
      console.error('[GenSDK] err NEED config file path');
      return;
    }
    cfgPath = path.isAbsolute(cfgPath) ? cfgPath : path.join(process.cwd(), cfgPath);
    genSDK(cfgPath)
      .then(_ => process.exit(0))
      .catch(error => {
        console.log('[GenSDK] err:\n', error);
        process.exit(-1);
      });
  });

program.command('*').action(function() {
  program.help();
});

program.parse(process.argv);

let proc = program.runningCommand;
if (proc) {
  proc.on('close', process.exit.bind(process));
  proc.on('error', () => {
    process.exit(1);
  });
}

process.on('SIGINT', () => {
  if (proc) {
    proc.kill('SIGKILL');
  }
  process.exit(0);
});

if (!program.args || program.args.length < 1) {
  program.help();
}
