package org.bibletranslationtools.biel.downloadservice

import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DownloadServiceModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("DownloadService")

    /** Starts the foreground service, or updates its notification when it is already running. */
    Function("show") { channelId: String, title: String, body: String, percent: Int ->
      DownloadService.show(context, DownloadNotificationContent(channelId, title, body, percent))
    }

    /** Stops the foreground service and removes its notification. No-op when not running. */
    Function("stop") {
      DownloadService.stop()
    }
  }
}
