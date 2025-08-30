import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Métricas customizadas
const cacheHitRate = new Rate('cache_hits');
const responseTime = new Trend('response_time', true);

// Configuração do teste
export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Warm-up: 10 usuários por 30s
    { duration: '1m', target: 50 },  // Ramp-up: 50 usuários por 1min
    { duration: '2m', target: 50 },  // Sustain: 50 usuários por 2min
    { duration: '30s', target: 0 },  // Ramp-down: 0 usuários por 30s
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% das requisições < 2s
    http_req_failed: ['rate<0.01'],    // Taxa de erro < 1%
    http_reqs: ['rate>15'],            // RPS > 15
  },
};

// Função principal do teste
export default function () {
  // Parâmetros de teste para simular diferentes cenários
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Teste do endpoint principal de projetos
  const baseUrl = 'http://localhost:8000';
  
  // Teste 1: Health check principal (endpoint público)
  let response = http.get(`${baseUrl}/`, params);
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  // Verifica se há indicação de cache hit nos headers ou resposta
  const isCacheHit = response.headers['X-Cache-Status'] === 'HIT' || 
                     response.json('cache_status') === 'hit';
  cacheHitRate.add(isCacheHit);
  responseTime.add(response.timings.duration);

  // Simula pausa entre requisições (comportamento real do usuário)
  sleep(Math.random() * 2 + 1); // 1-3 segundos entre requisições

  // Teste 2: Health check do cache (10% das iterações)
  if (Math.random() < 0.1) {
    const healthResponse = http.get(`${baseUrl}/health/cache`, params);
    check(healthResponse, {
      'cache health is 200': (r) => r.status === 200,
      'cache is healthy': (r) => r.json('cache') === 'healthy',
    });
  }

  // Teste 3: Documentação da API (20% das iterações)
  if (Math.random() < 0.2) {
    const docsResponse = http.get(`${baseUrl}/docs`, params);
    check(docsResponse, {
      'docs status is 200': (r) => r.status === 200,
      'docs response time < 1000ms': (r) => r.timings.duration < 1000,
    });
  }
}

// Função de setup (executa uma vez no início)
export function setup() {
  console.log('🚀 Iniciando teste de carga do AEC-Axis');
  console.log('📊 Configuração: 50 usuários virtuais, 4 minutos de teste');
  console.log('🎯 Target: GET /api/projects/ com cache Redis');
  
  // Verifica se a API está respondendo
  const response = http.get('http://localhost:8000/health/');
  if (response.status !== 200) {
    throw new Error('API não está respondendo. Certifique-se de que o backend está rodando.');
  }
  
  return { startTime: new Date().toISOString() };
}

// Função de teardown (executa uma vez no final)
export function teardown(data) {
  console.log('✅ Teste concluído!');
  console.log(`📅 Iniciado em: ${data.startTime}`);
  console.log(`📅 Finalizado em: ${new Date().toISOString()}`);
  console.log('📊 Confira o relatório de métricas acima');
}