const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

/**
 * Adopts the UIScene lifecycle on iOS.
 *
 * Apps built with the iOS 27 SDK (Xcode 27) are terminated at launch on iOS 27
 * if they still use the AppDelegate-only lifecycle. Expo SDK 55's template
 * creates the window in AppDelegate and has no SceneDelegate, so this plugin:
 *
 * - adds a UIApplicationSceneManifest pointing at SceneDelegate,
 * - moves window creation / React Native startup from AppDelegate into
 *   SceneDelegate.scene(_:willConnectTo:options:),
 * - forwards URLs, user activities and lifecycle events from the scene back
 *   into the AppDelegate so Expo's AppDelegate subscribers and RCTLinkingManager
 *   keep working as before.
 *
 * Remove this plugin once the app is on an Expo SDK whose template ships a
 * SceneDelegate (SDK 58+).
 */

const MARKER = '// @generated withSceneLifecycle';

const START_RN_BLOCK =
  /#if os\(iOS\) \|\| os\(tvOS\)\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*factory\.startReactNative\(\s*withModuleName: "main",\s*in: window,\s*launchOptions: launchOptions\)\s*#endif\n/;

const SCENE_DELEGATE = `
${MARKER}
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  private var appDelegate: AppDelegate? {
    UIApplication.shared.delegate as? AppDelegate
  }

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate,
          let factory = appDelegate.reactNativeFactory else {
      return
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    // With scenes, a cold-start URL arrives here instead of in the app's
    // launchOptions. Rebuild the keys RCTLinkingManager.getInitialURL reads.
    var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions[.url] = url
    }
    if let activity = connectionOptions.userActivities.first {
      launchOptions[.userActivityDictionary] = [
        UIApplication.LaunchOptionsKey.userActivityType.rawValue: activity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": activity,
      ]
    }

    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions.isEmpty ? nil : launchOptions)
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let appDelegate else { return }
    for context in URLContexts {
      var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
      if let source = context.options.sourceApplication {
        options[.sourceApplication] = source
      }
      _ = appDelegate.application(UIApplication.shared, open: context.url, options: options)
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = appDelegate?.application(UIApplication.shared, continue: userActivity) { _ in }
  }

  // UIApplication lifecycle callbacks are not sent to the AppDelegate once a
  // scene manifest exists; forward them so Expo subscribers still see them.
  func sceneDidBecomeActive(_ scene: UIScene) {
    appDelegate?.applicationDidBecomeActive(UIApplication.shared)
  }

  func sceneWillResignActive(_ scene: UIScene) {
    appDelegate?.applicationWillResignActive(UIApplication.shared)
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    appDelegate?.applicationWillEnterForeground(UIApplication.shared)
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    appDelegate?.applicationDidEnterBackground(UIApplication.shared)
  }
}
`;

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (config) => {
    const { language, contents } = config.modResults;
    if (language !== 'swift') {
      throw new Error(`withSceneLifecycle: expected a Swift AppDelegate, got ${language}`);
    }
    if (contents.includes(MARKER)) {
      return config;
    }

    if (!START_RN_BLOCK.test(contents)) {
      throw new Error(
        'withSceneLifecycle: could not find the window/startReactNative block in AppDelegate.swift. ' +
          'The Expo template changed; update plugins/withSceneLifecycle.js.',
      );
    }

    config.modResults.contents =
      contents.replace(
        START_RN_BLOCK,
        '    // Window creation and React Native startup live in SceneDelegate.\n',
      ) + SCENE_DELEGATE;
    return config;
  });
}

function withSceneManifest(config) {
  return withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return config;
  });
}

function withSceneLifecycle(config) {
  return withSceneManifest(withSceneAppDelegate(config));
}

module.exports = withSceneLifecycle;
