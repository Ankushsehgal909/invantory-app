import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { Package, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface LoginForm {
  phone: string;
  password: string;
}

export function LoginScreen() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await login(data.phone, data.password);
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Login failed. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Package size={40} color="#fff" />
          </View>
        </View>

        <Text style={styles.title}>Sign in to ShopStock</Text>
        <Text style={styles.subtitle}>Manage your inventory and sales efficiently</Text>

        <View style={styles.form}>
          <Controller
            control={control}
            name="phone"
            rules={{
              required: 'Phone number is required',
              pattern: {
                value: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
                message: 'Please enter a valid phone number',
              },
            }}
            render={({ field }) => (
              <View style={styles.inputContainer}>
                <TextInput
                  {...field}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoComplete="tel"
                  style={[
                    styles.input,
                    errors.phone && styles.inputError,
                  ]}
                />
                {errors.phone && (
                  <Text style={styles.errorText}>{errors.phone.message}</Text>
                )}
              </View>
            )}
          />

          <Controller
            control={control}
            name="password"
            rules={{
              required: 'Password is required',
              minLength: {
                value: 8,
                message: 'Password must be at least 8 characters',
              },
            }}
            render={({ field }) => (
              <View style={styles.inputContainer}>
                <TextInput
                  {...field}
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="current-password"
                  style={[
                    styles.input,
                    errors.password && styles.inputError,
                  ]}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  {showPassword ? <EyeOff size={24} color="#94a3b8" /> : <Eye size={24} color="#94a3b8" />}
                </TouchableOpacity>
                {errors.password && (
                  <Text style={styles.errorText}>{errors.password.message}</Text>
                )}
              </View>
            )}
          />

          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}
            style={[
              styles.submitButton,
              isLoading && styles.submitButtonDisabled,
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Sign in</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.demoText}>
          <Text style={styles.demoLabel}>No demo user seeded:</Text>
          <Text style={styles.demoValue}>Create a user via API or seed script first</Text>
          <Text style={{...styles.demoValue, color: '#64748b', fontSize: 12, marginTop: 4}}>(Login expects a registered phone number)</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 52,
    paddingHorizontal: 16,
    paddingRight: 48,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -12,
  },
  errorText: {
    position: 'absolute',
    bottom: -20,
    left: 0,
    fontSize: 12,
    color: '#ef4444',
  },
  submitButton: {
    height: 52,
    backgroundColor: '#0ea5e9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  demoText: {
    marginTop: 32,
    alignItems: 'center',
  },
  demoLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  demoValue: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#0ea5e9',
    marginTop: 4,
  },
});