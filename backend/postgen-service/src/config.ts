import path from 'node:path';
import Conf from 'conf';

export interface PostgenConfig {
  'output.imageDir': string;
  'llm.apiKey'?: string;
  'llm.baseUrl'?: string;
  'llm.model'?: string;
  'llm.timeoutMs'?: number;
}

const fallbackOutputDir = path.resolve(process.cwd(), 'out');
const fallbackLlmTimeoutMs = 12000;

export const config = new Conf<PostgenConfig>({
  projectName: 'postgen',
  projectSuffix: '',
  defaults: {
    'output.imageDir': fallbackOutputDir,
    'llm.timeoutMs': fallbackLlmTimeoutMs,
  },
});

export function getOutputImageDir() {
  return config.get('output.imageDir') || fallbackOutputDir;
}

export function setOutputImageDir(dir: string) {
  const resolved = path.resolve(dir);
  config.set('output.imageDir', resolved);
  return resolved;
}

export function getLlmConfig() {
  const apiKey = config.get('llm.apiKey');
  const baseUrl = config.get('llm.baseUrl');
  const model = config.get('llm.model');
  const timeoutMs = config.get('llm.timeoutMs') || fallbackLlmTimeoutMs;

  if (!apiKey || !baseUrl || !model) return null;

  return {
    apiKey,
    baseUrl,
    model,
    timeoutMs,
  };
}

export function setLlmConfigItem(key: 'llm.apiKey' | 'llm.baseUrl' | 'llm.model' | 'llm.timeoutMs', value: string) {
  if (key === 'llm.timeoutMs') {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error('llm.timeoutMs must be a positive integer');
    }
    config.set(key, parsed);
    return parsed;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    throw new Error(`${key} cannot be empty`);
  }
  config.set(key, trimmed);
  return trimmed;
}

export function resetConfigItem(key: keyof PostgenConfig) {
  if (key === 'output.imageDir') {
    config.set('output.imageDir', fallbackOutputDir);
    return fallbackOutputDir;
  }
  if (key === 'llm.timeoutMs') {
    config.set('llm.timeoutMs', fallbackLlmTimeoutMs);
    return fallbackLlmTimeoutMs;
  }
  config.delete(key);
  return '';
}

export function makeBatchOutputDir(baseDir: string, label = 'batch') {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return path.join(baseDir, `${label}-${stamp}`);
}
