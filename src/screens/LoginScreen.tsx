import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing } from '../constants/theme';
import { STAFF_PASSWORD, MANAGER_PASSWORD } from '../config/auth';

interface LoginScreenProps {
  onLoginSuccess: (role: 'staff' | 'manager') => void;
  currentPasswords?: { staff: string; manager: string };
}

export default function LoginScreen({ onLoginSuccess, currentPasswords }: LoginScreenProps) {
  const systemScheme = useColorScheme();
  const colors = Colors[systemScheme === 'dark' ? 'dark' : 'light'];

  const [role, setRole] = useState<'staff' | 'manager'>('staff');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    if (password.trim() === '') {
      setError('Vui lòng nhập mật khẩu!');
      return;
    }

    setIsLoading(true);

    const correctPassword = currentPasswords
      ? (role === 'staff' ? currentPasswords.staff : currentPasswords.manager)
      : (role === 'staff' ? STAFF_PASSWORD : MANAGER_PASSWORD);

    // Thêm một khoảng trễ nhỏ để trải nghiệm mượt mà hơn
    setTimeout(async () => {
      if (password === correctPassword) {
        try {
          await AsyncStorage.setItem('@pos_login_timestamp', Date.now().toString());
          await AsyncStorage.setItem('@pos_user_role', role);
          setIsLoading(false);
          onLoginSuccess(role);
        } catch (err) {
          console.error('Error saving login state:', err);
          setError('Đã xảy ra lỗi khi lưu trạng thái đăng nhập!');
          setIsLoading(false);
        }
      } else {
        setError('Mật khẩu không đúng. Vui lòng thử lại!');
        setIsLoading(false);
      }
    }, 600);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo / Icon */}
          <View style={[styles.logoContainer, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="storefront-outline" size={64} color={colors.primary} />
          </View>

          {/* Header Texts */}
          <Text style={[styles.title, { color: colors.text }]}>Bánh canh POS 🏪</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Nhập mật khẩu cửa hàng để quản lý và bán hàng
          </Text>

          {/* Form Card */}
          <View style={[styles.formCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Chọn vai trò đăng nhập</Text>
            
            <View style={styles.roleContainer}>
              <TouchableOpacity
                onPress={() => {
                  setRole('staff');
                  setError(null);
                }}
                style={[
                  styles.roleCard,
                  { borderColor: colors.border },
                  role === 'staff' && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                ]}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="restaurant-outline" 
                  size={20} 
                  color={role === 'staff' ? colors.primary : colors.textSecondary} 
                />
                <Text style={[styles.roleText, { color: role === 'staff' ? colors.text : colors.textSecondary }]}>
                  Nhân viên
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setRole('manager');
                  setError(null);
                }}
                style={[
                  styles.roleCard,
                  { borderColor: colors.border },
                  role === 'manager' && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                ]}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="shield-checkmark-outline" 
                  size={20} 
                  color={role === 'manager' ? colors.primary : colors.textSecondary} 
                />
                <Text style={[styles.roleText, { color: role === 'manager' ? colors.text : colors.textSecondary }]}>
                  Quản lý
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: Spacing.three }]}>
              Mật khẩu truy cập
            </Text>

            <View style={[styles.inputContainer, { borderColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />

              <TextInput
                placeholder="Nhập mật khẩu..."
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError(null);
                }}
                secureTextEntry={!showPassword}
                style={[styles.inputBox, { color: colors.text }]}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numeric" // Tối ưu cho mật khẩu dạng số/pin
                onSubmitEditing={handleLogin}
              />

              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={16} color="#FF4D4D" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>ĐĂNG NHẬP</Text>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Spacing.five,
    alignItems: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.five,
    paddingHorizontal: Spacing.two,
  },
  formCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: Spacing.two,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: Spacing.three,
  },
  inputIcon: {
    marginRight: Spacing.two,
  },
  inputBox: {
    flex: 1,
    height: '100%',
    fontSize: 15,
  },
  eyeBtn: {
    padding: Spacing.one,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.two,
    gap: 4,
  },
  errorText: {
    color: '#FF4D4D',
    fontSize: 13,
    fontWeight: '500',
  },
  submitBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.four,
  },
  submitBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.8,
  },
  footerText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: Spacing.six,
    lineHeight: 16,
    opacity: 0.7,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  roleCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
  },
  roleText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
