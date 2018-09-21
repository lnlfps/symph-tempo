const notifier = require('node-notifier')
const childProcess = require('child_process')
const rimraf = require('rimraf')
const mkdirp = require('mkdirp')
const isWindows = /^win/.test(process.platform)

export async function compile (task) {
  await task.parallel(['src'])
}

export async function src (task, opts) {
  await task.source(opts.src || 'src/**/*.js').babel().target('dist/')
  notify('Compiled src files')
}


export async function build (task) {
  await task.serial(['compile'])
}

export default async function (task) {
  await task.start('build')
  await task.watch('src/**/*.js', 'src')
}

export async function release (task) {
  await task.clear('dist').start('build')
}

// notification helper
function notify (msg) {
  return notifier.notify({
    title: '▲ @symph/tempo',
    message: msg,
    icon: false
  })
}
