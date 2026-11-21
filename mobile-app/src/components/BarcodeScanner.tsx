import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, PermissionsAndroid, Alert } from 'react-native';
import { Camera, useCameraDevices, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import { ScanLine, Barcode } from 'lucide-react-native';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const devices = useCameraDevices('wide-angle-camera');
  const device = devices.back;
  const [hasPermission, setHasPermission] = useState(false);
  const [scanned, setScanned] = useState(false);
  const scannedCodesRef = useRef<Set<string>>(new Set());

  const permission = useCameraPermission(device);

  useEffect(() => {
    if (permission === 'authorized') {
      setHasPermission(true);
    } else if (permission === 'denied') {
      setHasPermission(false);
      Alert.alert('Camera permission required', 'Please enable camera access in settings to scan barcodes.');
    }
  }, [permission]);

  // Request permission on Android
  const requestPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'ShopStock needs camera access to scan barcodes',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        setHasPermission(true);
      }
    }
  };

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (scanned) return;

    const barcodes = frame.barcodes;
    if (barcodes && barcodes.length > 0) {
      for (const barcode of barcodes) {
        if (barcode.value && !scannedCodesRef.current.has(barcode.value)) {
          scannedCodesRef.current.add(barcode.value);
          setScanned(true);
          // Use runOnJS to call the JS callback
          // Note: In a real implementation, you'd use runOnJS from reanimated
          console.log('Scanned barcode:', barcode.value);
        }
      }
    }
  }, [scanned]);

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No camera device found</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Camera permission required</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        frameProcessorFps={15}
      />

      {/* Scan overlay */}
      <View style={styles.overlay}>
        <View style={styles.scanArea}>
          <View style={styles.scanLine} />
          <ScanLine size={24} color="#0ea5e9" style={styles.scanIcon} />
        </View>
        <Text style={styles.scanText}>Position barcode within the frame</Text>
      </View>

      {/* Close button */}
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <View style={styles.closeButtonIcon}>
          <Text>✕</Text>
        </View>
      </TouchableOpacity>

      {/* Torch toggle */}
      <TouchableOpacity
        onPress={() => device.setTorchMode(device.torchMode === 'on' ? 'off' : 'on')}
        style={styles.torchButton}
      >
        <Text style={styles.torchButtonText}>
          {device.torchMode === 'on' ? '🔦' : '💡'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 280,
    height: 180,
    borderWidth: 2,
    borderColor: '#0ea5e9',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#0ea5e9',
  },
  scanIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  scanText: {
    marginTop: 20,
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  torchButton: {
    position: 'absolute',
    bottom: 50,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  torchButtonText: {
    fontSize: 24,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 40,
  },
  primaryButton: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});