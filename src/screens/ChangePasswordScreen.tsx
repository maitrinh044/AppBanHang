import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  useColorScheme,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../constants/theme';
import { ADMIN_GMAIL, GOOGLE_SCRIPT_URL } from '../config/auth';
import { db } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface ChangePasswordScreenProps {
  onBack: () => void;
  currentManagerPassword: string;
}

export default function ChangePasswordScreen({ onBack, currentManagerPassword }: ChangePasswordScreenProps) {
  const systemScheme = useColorScheme();
  const colors = Colors[systemScheme === 'dark' ? 'dark' : 'light'];

  const [verifyCurrentPass, setVerifyCurrentPass] = useState('');
  const [newStaffPass, setNewStaffPass] = useState('');
  const [newManagerPass, setNewManagerPass] = useState('');

  const [showVerifyPass, setShowVerifyPass] = useState(false);
  const [showNewStaffPass, setShowNewStaffPass] = useState(false);
  const [showNewManagerPass, setShowNewManagerPass] = useState(false);

  // OTP States
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [userInputOtp, setUserInputOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [isLoading, setIsLoading] = useState(false);

  // Apps Script Guide
  const [showScriptGuide, setShowScriptGuide] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOtp = async () => {
    if (verifyCurrentPass !== currentManagerPassword) {
      Alert.alert('Lỗi xác thực', 'Mật khẩu Quản lý hiện tại không đúng!');
      return;
    }
    if (newStaffPass.trim().length < 4 || newManagerPass.trim().length < 4) {
      Alert.alert('Lỗi nhập liệu', 'Mật khẩu mới phải có tối thiểu 4 ký tự!');
      return;
    }

    setIsLoading(true);

    // Tạo mã OTP 6 số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000; // Có hiệu lực 5 phút

    const email = ADMIN_GMAIL;
    const subject = "MÃ OTP XÁC THỰC THAY ĐỔI MẬT KHẨU - BÁNH CANH POS";
    const body = `Chào bạn,\n\nYêu cầu thay đổi mật khẩu hệ thống vừa được thực hiện trên ứng dụng POS.\n\nMã OTP xác nhận của bạn là: ${otp}\n\nMã này có hiệu lực trong vòng 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.\n\nTrân trọng,\nBánh canh POS`;

    let sentRealEmail = false;

    if (GOOGLE_SCRIPT_URL) {
      try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, subject, body }),
        });
        sentRealEmail = true;
      } catch (err) {
        console.error('Lỗi khi gửi email qua Google Apps Script:', err);
      }
    }

    setGeneratedOtp(otp);
    setOtpExpiresAt(expires);
    setIsOtpSent(true);
    setCountdown(60);
    setIsLoading(false);

    if (sentRealEmail) {
      Alert.alert('Thành công', `Mã OTP đã được gửi đến địa chỉ Gmail của bạn (${ADMIN_GMAIL}). Vui lòng kiểm tra hộp thư!`);
    } else {
      // Chế độ thử nghiệm khi chưa có GOOGLE_SCRIPT_URL
      Alert.alert(
        'Chế độ thử nghiệm',
        `Mã OTP được tạo là: ${otp}\n\n(Để gửi email thật về Gmail ${ADMIN_GMAIL}, hãy cấu hình Google Apps Script URL theo hướng dẫn bên dưới).`
      );
    }
  };

  const handleVerifyAndSave = async () => {
    if (!generatedOtp || !otpExpiresAt) {
      Alert.alert('Lỗi', 'Vui lòng yêu cầu gửi mã OTP trước!');
      return;
    }

    if (Date.now() > otpExpiresAt) {
      Alert.alert('Lỗi', 'Mã OTP đã hết hạn! Vui lòng yêu cầu mã mới.');
      return;
    }

    if (userInputOtp !== generatedOtp) {
      Alert.alert('Lỗi', 'Mã OTP nhập vào không chính xác!');
      return;
    }

    setIsLoading(true);

    try {
      if (db) {
        // Ghi đè mật khẩu mới lên Firestore
        await setDoc(doc(db, 'settings', 'auth'), {
          staffPassword: newStaffPass.trim(),
          managerPassword: newManagerPass.trim(),
          updatedAt: Date.now(),
        });
        
        setIsLoading(false);
        Alert.alert('Thành công', 'Đã thay đổi mật khẩu hệ thống thành công!', [
          { text: 'OK', onPress: onBack }
        ]);
      } else {
        setIsLoading(false);
        Alert.alert('Lỗi kết nối', 'Firebase chưa được kết nối nên không thể lưu mật khẩu lên đám mây.');
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật mật khẩu:', err);
      setIsLoading(false);
      Alert.alert('Thất bại', 'Không thể lưu mật khẩu mới lên Firestore. Vui lòng kiểm tra lại!');
    }
  };

  const gasCodeExample = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    MailApp.sendEmail(data.email, data.subject, data.body);
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Cấu Hình Mật Khẩu</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Email Info box */}
          <View style={[styles.infoCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
            <Ionicons name="mail" size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>Email xác thực OTP</Text>
              <Text style={[styles.infoDesc, { color: colors.textSecondary }]}>
                Mã xác thực sẽ được gửi trực tiếp đến Gmail của bạn: <Text style={{ fontWeight: 'bold', color: colors.primary }}>{ADMIN_GMAIL}</Text>
              </Text>
            </View>
          </View>

          {/* Form */}
          <View style={[styles.formCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            
            {/* Mật khẩu quản lý hiện tại */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Xác nhận mật khẩu Quản lý hiện tại</Text>
            <View style={[styles.inputContainer, { borderColor: colors.border }]}>
              <Ionicons name="key-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                placeholder="Nhập mật khẩu quản lý đang dùng..."
                placeholderTextColor={colors.textSecondary}
                value={verifyCurrentPass}
                onChangeText={setVerifyCurrentPass}
                secureTextEntry={!showVerifyPass}
                style={[styles.inputBox, { color: colors.text }]}
                keyboardType="numeric"
              />
              <TouchableOpacity onPress={() => setShowVerifyPass(!showVerifyPass)} style={styles.eyeBtn}>
                <Ionicons name={showVerifyPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Mật khẩu mới Nhân viên */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: Spacing.two }]}>Mật khẩu mới của Nhân viên</Text>
            <View style={[styles.inputContainer, { borderColor: colors.border }]}>
              <Ionicons name="restaurant-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                placeholder="Nhập mật khẩu mới nhân viên..."
                placeholderTextColor={colors.textSecondary}
                value={newStaffPass}
                onChangeText={setNewStaffPass}
                secureTextEntry={!showNewStaffPass}
                style={[styles.inputBox, { color: colors.text }]}
                keyboardType="numeric"
              />
              <TouchableOpacity onPress={() => setShowNewStaffPass(!showNewStaffPass)} style={styles.eyeBtn}>
                <Ionicons name={showNewStaffPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Mật khẩu mới Quản lý */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: Spacing.three }]}>Mật khẩu mới của Quản lý</Text>
            <View style={[styles.inputContainer, { borderColor: colors.border }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                placeholder="Nhập mật khẩu mới quản lý..."
                placeholderTextColor={colors.textSecondary}
                value={newManagerPass}
                onChangeText={setNewManagerPass}
                secureTextEntry={!showNewManagerPass}
                style={[styles.inputBox, { color: colors.text }]}
                keyboardType="numeric"
              />
              <TouchableOpacity onPress={() => setShowNewManagerPass(!showNewManagerPass)} style={styles.eyeBtn}>
                <Ionicons name={showNewManagerPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Button Send OTP */}
            <TouchableOpacity
              onPress={handleSendOtp}
              disabled={isLoading || countdown > 0}
              style={[
                styles.actionBtn,
                { backgroundColor: colors.primary },
                (isLoading || countdown > 0) && { opacity: 0.6 }
              ]}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.actionBtnText}>
                  {countdown > 0 ? `Gửi lại mã OTP sau (${countdown}s)` : 'GỬI MÃ OTP XÁC THỰC'}
                </Text>
              )}
            </TouchableOpacity>

            {/* OTP Verification Block */}
            {isOtpSent && (
              <View style={[styles.otpBlock, { borderTopColor: colors.border }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nhập mã xác thực OTP (6 chữ số)</Text>
                <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    placeholder="Nhập 6 số OTP..."
                    placeholderTextColor={colors.textSecondary}
                    value={userInputOtp}
                    onChangeText={setUserInputOtp}
                    keyboardType="numeric"
                    maxLength={6}
                    style={[styles.inputBox, { color: colors.text, letterSpacing: 4, fontWeight: 'bold' }]}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleVerifyAndSave}
                  disabled={isLoading}
                  style={[styles.submitBtn, { backgroundColor: colors.success }]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitBtnText}>XÁC NHẬN & LƯU THAY ĐỔI</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Hướng dẫn cài đặt Google Apps Script */}
          <TouchableOpacity
            onPress={() => setShowScriptGuide(!showScriptGuide)}
            style={[styles.guideHeader, { borderBottomColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.guideTitle, { color: colors.text }]}>
              {showScriptGuide ? '👇 Ẩn hướng dẫn gửi email thật' : '👉 Hướng dẫn cài đặt gửi email thật qua Gmail'}
            </Text>
          </TouchableOpacity>

          {showScriptGuide && (
            <View style={[styles.guideCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
              <Text style={[styles.guideStep, { color: colors.text }]}>1. Truy cập trang <Text style={{ fontWeight: 'bold', color: colors.primary }}>script.google.com</Text> và đăng nhập bằng Gmail của bạn.</Text>
              <Text style={[styles.guideStep, { color: colors.text }]}>2. Nhấn nút **Dự án mới**.</Text>
              <Text style={[styles.guideStep, { color: colors.text }]}>3. Xóa hết code mặc định và dán đoạn mã sau vào:</Text>
              
              <View style={styles.codeBlock}>
                <Text style={styles.codeText}>{gasCodeExample}</Text>
                <TouchableOpacity
                  onPress={() => {
                    Clipboard.setString(gasCodeExample);
                    Alert.alert('Đã sao chép', 'Đã sao chép đoạn mã Google Apps Script vào bộ nhớ tạm!');
                  }}
                  style={styles.copyBtn}
                >
                  <Ionicons name="copy" size={16} color="#FFF" />
                  <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>Copy</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.guideStep, { color: colors.text, marginTop: Spacing.two }]}>4. Nhấn nút **Triển khai** (Deploy) ở góc trên bên phải → Chọn **Triển khai mới** (New deployment).</Text>
              <Text style={[styles.guideStep, { color: colors.text }]}>5. Chọn loại triển khai là **Ứng dụng web** (Web app).</Text>
              <Text style={[styles.guideStep, { color: colors.text }]}>6. Cấu hình triển khai:</Text>
              <Text style={[styles.guideSubStep, { color: colors.textSecondary }]}>• Người thực hiện: **Tôi** (Gmail của bạn)</Text>
              <Text style={[styles.guideSubStep, { color: colors.textSecondary }]}>• Ai có quyền truy cập: **Bất kỳ ai** (Anyone)</Text>
              <Text style={[styles.guideStep, { color: colors.text, marginTop: Spacing.one }]}>7. Nhấn **Triển khai**, Google sẽ yêu cầu cấp quyền gửi mail (chọn Advanced → Go to ... (unsafe)).</Text>
              <Text style={[styles.guideStep, { color: colors.text }]}>8. Copy **Đường dẫn URL ứng dụng web** nhận được và mở file <Text style={{ fontStyle: 'italic', fontWeight: 'bold' }}>src/config/auth.ts</Text> trong code để dán vào biến <Text style={{ fontWeight: 'bold' }}>GOOGLE_SCRIPT_URL</Text>.</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    height: 56,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  infoDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  formCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: Spacing.three,
    marginBottom: Spacing.three,
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
    borderRadius: 10,
    height: 44,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.three,
  },
  inputIcon: {
    marginRight: Spacing.two,
  },
  inputBox: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  eyeBtn: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: Spacing.one,
  },
  actionBtn: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  otpBlock: {
    marginTop: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
  },
  submitBtn: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  submitBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  guideHeader: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: Spacing.three,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  guideCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.three,
    gap: 8,
  },
  guideStep: {
    fontSize: 13,
    lineHeight: 18,
  },
  guideSubStep: {
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 14,
  },
  codeBlock: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    position: 'relative',
    marginTop: 6,
  },
  codeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontFamily: 'Courier',
    lineHeight: 15,
  },
  copyBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
