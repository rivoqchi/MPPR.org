import { zodResolver } from '@hookform/resolvers/zod'
import { LockOutlined, PhoneOutlined } from '@ant-design/icons'
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  ConfigProvider,
  Form,
  Input,
  Typography,
  theme,
} from 'antd'
import type { Control, FieldErrors } from 'react-hook-form'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { loginWithPhone } from '@/shared/api/auth-api'
import { resetAppDataSession } from '@/shared/lib/realtime/sync-app-data'
import { clearTokens, setTokens } from '@/shared/lib/token-storage'
import { selectIsAuthenticated, useAuthStore } from '@/entities/user/model/auth-store'
import {
  extractLoginRetryAfterSeconds,
  useLoginLockout,
} from '@/features/auth/lib/use-login-lockout'
import {
  loginFormSchema,
  type LoginFormSchema,
} from '@/features/auth/model/login-form-schema'
import {
  formatPhoneDisplay,
  formatPhoneInput,
  PHONE_PREFIX,
} from '@/features/users/lib/phone'
import { useNotifyApiError } from '@/shared/hooks/useNotifyApiError'
import { resolveApiError } from '@/shared/lib/api-error'
import { APP_NAME } from '@/shared/lib/constants'

const LOGIN_BG_URL = '/login-bg.png'
const LOGIN_BG_OVERLAY =
  'linear-gradient(rgba(4, 8, 18, 0.84), rgba(4, 8, 18, 0.92))'

const defaultValues: LoginFormSchema = {
  phone: PHONE_PREFIX,
  password: '',
  rememberMe: false,
}

interface LoginPageContentProps {
  control: Control<LoginFormSchema>
  errors: FieldErrors<LoginFormSchema>
  isFormDisabled: boolean
  isLocked: boolean
  remainingSeconds: number
  onSubmit: () => void
}

function LoginPageContent({
  control,
  errors,
  isFormDisabled,
  isLocked,
  remainingSeconds,
  onSubmit,
}: LoginPageContentProps) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const getError = (key?: string) => (key ? t(key) : undefined)

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: '#060a14',
        backgroundImage: `${LOGIN_BG_OVERLAY}, url(${LOGIN_BG_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <style>
        {`
          .login-page-form.ant-form-vertical .ant-form-item-label {
            padding-bottom: 2px !important;
          }
          .login-page-form.ant-form-vertical .ant-form-item-label > label {
            height: auto;
            margin-bottom: 0;
            color: ${token.colorText};
          }
          .login-page-form .ant-form-item {
            margin-bottom: 14px;
          }
          .login-page-form .ant-input-affix-wrapper-lg {
            min-height: 48px;
            padding-block: 10px;
          }
        `}
      </style>
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: token.boxShadowSecondary,
          color: token.colorText,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Typography.Title level={2} style={{ marginBottom: 8, color: token.colorPrimary }}>
            {APP_NAME}
          </Typography.Title>
          <Typography.Text type="secondary">{t('auth.subtitle')}</Typography.Text>
        </div>

        {isLocked && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message={t('auth.lockout.title')}
            description={t('auth.lockout.description', { seconds: remainingSeconds })}
          />
        )}

        <Form className="login-page-form" layout="vertical" onFinish={onSubmit}>
          <Form.Item
            label={t('auth.fields.phone')}
            validateStatus={errors.phone ? 'error' : undefined}
            help={getError(errors.phone?.message)}
          >
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  size="large"
                  disabled={isFormDisabled}
                  prefix={<PhoneOutlined />}
                  placeholder={t('users.placeholders.phone')}
                  value={formatPhoneDisplay(field.value)}
                  onChange={(event) => field.onChange(formatPhoneInput(event.target.value))}
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label={t('auth.fields.password')}
            validateStatus={errors.password ? 'error' : undefined}
            help={getError(errors.password?.message)}
          >
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <Input.Password
                  {...field}
                  size="large"
                  disabled={isFormDisabled}
                  prefix={<LockOutlined />}
                  placeholder={t('auth.placeholders.password')}
                />
              )}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 18 }}>
            <Controller
              name="rememberMe"
              control={control}
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  disabled={isFormDisabled}
                  onChange={(event) => field.onChange(event.target.checked)}
                >
                  {t('auth.fields.rememberMe')}
                </Checkbox>
              )}
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            disabled={isFormDisabled}
          >
            {isLocked
              ? t('auth.lockout.button', { seconds: remainingSeconds })
              : t('auth.login')}
          </Button>
        </Form>
      </Card>
    </div>
  )
}

export function LoginPage() {
  const { t } = useTranslation()
  const { notification } = App.useApp()
  const { notifyApiError } = useNotifyApiError()
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const login = useAuthStore((state) => state.login)

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormSchema>({
    resolver: zodResolver(loginFormSchema),
    defaultValues,
  })

  const phone = watch('phone')
  const {
    isLocked,
    remainingSeconds,
    clearLockout,
    registerFailedAttempt,
    applyServerLockout,
  } = useLoginLockout(phone)

  if (isAuthenticated) {
    const redirectTo =
      (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'

    return <Navigate to={redirectTo} replace />
  }

  const isFormDisabled = isSubmitting || isLocked

  const onSubmit = async (values: LoginFormSchema) => {
    if (isLocked) {
      notification.warning({
        message: t('auth.lockout.title'),
        description: t('auth.lockout.description', { seconds: remainingSeconds }),
      })
      return
    }

    try {
      clearTokens()
      resetAppDataSession()
      useAuthStore.getState().logout()

      const response = await loginWithPhone(values.phone, values.password, values.rememberMe)
      clearLockout()
      setTokens(response.accessToken, response.refreshToken)
      login({ ...response.user, password: '' })

      const redirectTo =
        (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'

      navigate(redirectTo, { replace: true })
    } catch (error) {
      clearTokens()

      const retryAfterSeconds = extractLoginRetryAfterSeconds(error)

      if (retryAfterSeconds !== null) {
        applyServerLockout(retryAfterSeconds)
        notification.warning({
          message: t('auth.lockout.title'),
          description: t('auth.lockout.description', { seconds: retryAfterSeconds }),
        })
        return
      }

      const resolved = resolveApiError(error, t, 'auth.notifications.invalidCredentials')

      if (resolved.code === 'USER_INACTIVE') {
        notifyApiError(error, {
          titleKey: 'auth.notifications.errorTitle',
          fallbackKey: 'auth.notifications.accountInactive',
        })
        return
      }

      const failure = registerFailedAttempt()

      if (failure.locked) {
        notification.warning({
          message: t('auth.lockout.title'),
          description: t('auth.lockout.description', { seconds: failure.retryAfterSeconds }),
        })
        return
      }

      notifyApiError(error, {
        titleKey: 'auth.notifications.errorTitle',
        fallbackKey: 'auth.notifications.invalidCredentials',
      })
    }
  }

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
      <LoginPageContent
        control={control}
        errors={errors}
        isFormDisabled={isFormDisabled}
        isLocked={isLocked}
        remainingSeconds={remainingSeconds}
        onSubmit={handleSubmit(onSubmit)}
      />
    </ConfigProvider>
  )
}
