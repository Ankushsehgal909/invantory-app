module.exports = {
  assets: ['./src/assets/fonts'],
  commands: [],
  dependencies: {
    'react-native-vision-camera': {
      platforms: {
        android: {
          sourceDir: '../node_modules/react-native-vision-camera/android',
        },
        ios: {
          podspecPath: '../node_modules/react-native-vision-camera/ios/Frameworks/Camera.xcframework',
        },
      },
    },
    'react-native-push-notification': {
      platforms: {
        android: {
          sourceDir: '../node_modules/react-native-push-notification/android',
        },
        ios: null,
      },
    },
    '@react-native-community/push-notification-ios': {
      platforms: {
        ios: {
          podspecPath: '../node_modules/@react-native-community/push-notification-ios/RNPushNotificationIOS.podspec',
        },
      },
    },
  },
  project: {
    ios: {},
    android: {},
  },
};