self.addEventListener('push', event => {
  const {message} = event.data.json();
  const item = {id: crypto.randomUUID(), message};
  const key = new URL('last-bell', self.registration.scope);
  event.waitUntil(Promise.all([
    self.registration.showNotification('Notre maison', {body:message}),
    caches.open('maison-bell-v1').then(cache => cache.put(key, Response.json(item))),
    self.clients.matchAll({type:'window', includeUncontrolled:true}).then(windows => {
      for (const client of windows) if (client.url.startsWith(self.registration.scope)) client.postMessage(item);
    })
  ]));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({type:'window', includeUncontrolled:true}).then(windows => {
    const page = windows.find(client => client.url === self.registration.scope);
    return page ? page.focus() : self.clients.openWindow(self.registration.scope);
  }));
});
