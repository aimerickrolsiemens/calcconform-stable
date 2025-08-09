import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, Animated, Image } from 'react-native';
import { Shield, Eye, EyeOff, CircleAlert as AlertCircle } from 'lucide-react-native';
import { Button } from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

export function AuthenticationScreen() {
  const { authenticate } = useAuth();
  const { theme } = useTheme();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation d'entrée
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleSubmit = async () => {
    if (!code.trim()) {
      setError('Veuillez saisir le code d\'authentification');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await authenticate(code.trim());
      
      if (!success) {
        setError('Code d\'authentification incorrect');
        setCode('');
        
        // Animation de secousse pour l'erreur
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
        ]).start();
      }
    } catch (error) {
      console.error('Erreur lors de l\'authentification:', error);
      setError('Erreur lors de l\'authentification. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const toggleShowCode = () => {
    setShowCode(!showCode);
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.overlay}>
      <Animated.View 
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { translateX: shakeAnim }
            ]
          }
        ]}
      >
        {/* En-tête avec logo */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/images/Siemens-Logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>CalcConform</Text>
        </View>

        {/* Icône de sécurité */}
        <View style={styles.iconContainer}>
          <Shield size={64} color={theme.colors.primary} />
        </View>

        {/* Titre et description */}
        <View style={styles.content}>
          <Text style={styles.title}>Authentification requise</Text>
          <Text style={styles.description}>
            Veuillez saisir le code d'authentification pour accéder à l'application Siemens CalcConform.
          </Text>
        </View>

        {/* Formulaire d'authentification */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Code d'authentification</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[
                  styles.input,
                  error && styles.inputError
                ]}
                value={code}
                onChangeText={(text) => {
                  setCode(text);
                  if (error) setError('');
                }}
                placeholder="Saisissez votre code"
                placeholderTextColor={theme.colors.textTertiary}
                secureTextEntry={!showCode}
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                editable={!loading}
                maxLength={20}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={toggleShowCode}
                disabled={loading}
              >
                {showCode ? (
                  <EyeOff size={20} color={theme.colors.textSecondary} />
                ) : (
                  <Eye size={20} color={theme.colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {error && (
            <Animated.View style={styles.errorContainer}>
              <AlertCircle size={16} color={theme.colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          )}

          <Button
            title={loading ? "Vérification..." : "Valider"}
            onPress={handleSubmit}
            disabled={loading || !code.trim()}
            style={styles.submitButton}
          />
        </View>

        {/* Footer informatif */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🔒 Vos données restent stockées localement sur votre appareil
          </Text>
          <Text style={styles.footerSubtext}>
            Cette authentification est requise pour accéder aux fonctionnalités de l'application.
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#0B1220',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
    margin: 0,
    padding: 20,
    ...(Platform.OS === 'web' && {
      position: 'fixed',
      width: '100vw',
      height: '100vh',
      margin: 0,
      padding: 20,
    }),
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 12,
  },
  logo: {
    height: 40,
    width: 132,
  },
  appName: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 20,
    backgroundColor: theme.colors.primary + '20',
    borderRadius: 50,
    alignSelf: 'center',
  },
  content: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingRight: 50,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    backgroundColor: theme.colors.inputBackground,
    color: theme.colors.text,
    textAlign: 'center',
    letterSpacing: 2,
    ...(Platform.OS === 'web' && {
      outlineWidth: 0,
    }),
  },
  inputError: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.error + '10',
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -10 }],
    padding: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.error + '20',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.error,
    flex: 1,
  },
  submitButton: {
    paddingVertical: 16,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  footerSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});