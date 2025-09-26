import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(() => {
    localStorage.clear();
    service = new CacheService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('stores and retrieves fresh entries', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    service.set('key', 'value', 1000);
    expect(service.get<string>('key')).toBe('value');
    expect(service.hasFresh('key')).toBe(true);
  });

  it('expires entries based on ttl', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    service.set('key', 'value', 500);
    jest.spyOn(Date, 'now').mockReturnValue(2000);
    expect(service.get('key')).toBeNull();
    expect(service.hasFresh('key')).toBe(false);
  });

  it('persists entries for configured namespace', () => {
    service.usePersistentNamespace('av:', true);
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    service.set('av:item', { foo: 'bar' }, 2000);
    const next = new CacheService();
    next.usePersistentNamespace('av:', true);
    jest.spyOn(Date, 'now').mockReturnValue(1500);
    expect(next.get<{ foo: string }>('av:item')).toEqual({ foo: 'bar' });
  });

  it('clears entries by prefix', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    service.set('a:one', 1, 1000);
    service.set('b:two', 2, 1000);
    service.clear('a:');
    expect(service.get('a:one')).toBeNull();
    expect(service.get('b:two')).toBe(2);
  });

  it('removes persistent entries when namespace disabled', () => {
    service.usePersistentNamespace('av:', true);
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    service.set('av:item', 'value', 1000);
    expect(localStorage.getItem('cache:v1:av:item')).not.toBeNull();
    service.usePersistentNamespace('av:', false);
    expect(localStorage.getItem('cache:v1:av:item')).toBeNull();
  });
});
