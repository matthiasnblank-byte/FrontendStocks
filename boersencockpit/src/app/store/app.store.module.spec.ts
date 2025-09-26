import { provideAppStore } from './app.store.module';
import { environment } from '../../environments/environment';

describe('provideAppStore', () => {
  it('creates providers with devtools in development', () => {
    const providers = provideAppStore();
    expect(providers).toBeDefined();
    if (!environment.production) {
      expect(JSON.stringify(providers)).toContain('store-devtools');
    }
  });
});
