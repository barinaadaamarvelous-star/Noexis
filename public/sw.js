self.addEventListener("push", function (event) {
  if (!event.data) return

  const data = event.data.json()

  event.waitUntil(
    self.registration.showNotification(data.title || "Reminder", {
      body: data.body || "You have something to do 👀",
      icon: "/icon.png",
      badge: "/badge.png",

      // 🔥 makes it feel alive
      vibrate: [200, 100, 200],

      // 🔥 groups notifications
      tag: "habit-reminder",

      // 🔥 keeps it visible until user interacts (important)
      requireInteraction: true,

      // optional extra data
      data: {
        url: "/tasks"
      }
    })
  )
})

self.addEventListener("notificationclick", function (event) {
  event.notification.close()

  event.waitUntil(
    clients.openWindow(event.notification.data?.url || "/")
  )
})