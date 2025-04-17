"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import API_URL from '@/lib/api-config';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    secretKey: '', // Mã bí mật để tạo tài khoản admin
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validations, setValidations] = useState({
    password: {
      minLength: false,
      hasNumber: false,
      hasSpecial: false,
      hasUppercase: false,
    },
    passwordsMatch: false,
  });

  // Validate password khi nhập
  useEffect(() => {
    setValidations({
      password: {
        minLength: formData.password.length >= 8,
        hasNumber: /\d/.test(formData.password),
        hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
        hasUppercase: /[A-Z]/.test(formData.password),
      },
      passwordsMatch: formData.password === formData.confirmPassword && formData.password !== '',
    });
  }, [formData.password, formData.confirmPassword]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Xóa thông báo lỗi khi người dùng bắt đầu nhập lại
    if (error) setError('');
  };

  const isFormValid = () => {
    const { password } = validations;
    return (
      formData.username.trim() !== '' &&
      formData.email.trim() !== '' &&
      formData.fullName.trim() !== '' &&
      formData.phone.trim() !== '' &&
      password.minLength &&
      password.hasNumber &&
      password.hasSpecial &&
      password.hasUppercase &&
      validations.passwordsMatch &&
      formData.secretKey.trim() !== ''
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isFormValid()) {
      setError('Vui lòng điền đầy đủ thông tin và đảm bảo mật khẩu đáp ứng các yêu cầu.');
      return;
    }

    setLoading(true);

    try {
      // Kiểm tra mã bí mật
      if (formData.secretKey !== 'FASTBITE_ADMIN_2025') {
        throw new Error('Mã bí mật không đúng. Bạn không có quyền tạo tài khoản quản trị.');
      }

      // Gọi API đăng ký
      const response = await axios.post(`${API_URL}/auth/register`, {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        name: formData.fullName,
        phone: formData.phone,
        role: 'admin',
        secretKey: formData.secretKey
      });
      
      // Xử lý thành công
      if (response.data && response.status === 201) {
        // Chuyển hướng về trang đăng nhập sau 2s để hiển thị thông báo thành công
        setTimeout(() => {
          router.push('/');
        }, 2000);
        
        // Hiển thị thông báo thành công
        setError('');
        setLoading(false);
        // Thông báo thành công sẽ hiển thị thông qua state success
      } else {
        throw new Error('Đăng ký không thành công. Vui lòng thử lại sau.');
      }
    } catch (err: any) {
      console.error('Lỗi đăng ký:', err);
      setError(err.response?.data?.message || err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại sau.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-red-50 to-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-32 h-32 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-red-700 rounded-full shadow-lg flex items-center justify-center text-white text-3xl font-bold transform transition-transform hover:scale-105">
              FB
            </div>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-gray-900">
          Đăng ký tài khoản quản trị
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Tạo tài khoản mới với vai trò quản trị viên
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-2xl sm:rounded-lg sm:px-10 transition-all duration-300 hover:shadow-xl">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded animate-pulse">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Tên đăng nhập
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm transition-colors duration-200"
                  placeholder="Nhập tên đăng nhập của bạn"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm transition-colors duration-200"
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Họ và tên
              </label>
              <div className="mt-1">
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm transition-colors duration-200"
                  placeholder="Nhập họ và tên đầy đủ"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Số điện thoại
              </label>
              <div className="mt-1">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm transition-colors duration-200"
                  placeholder="0912345678"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mật khẩu
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm transition-colors duration-200"
                  placeholder="Mật khẩu mới"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              
              {/* Password strength indicator */}
              <div className="mt-2 space-y-2">
                <p className="text-xs font-medium text-gray-700">Mật khẩu phải có:</p>
                <ul className="space-y-1 text-xs">
                  <li className={`flex items-center ${validations.password.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                    {validations.password.minLength ? <CheckCircle className="h-3 w-3 mr-1" /> : <div className="h-3 w-3 rounded-full border border-gray-300 mr-1"></div>}
                    Ít nhất 8 ký tự
                  </li>
                  <li className={`flex items-center ${validations.password.hasUppercase ? 'text-green-600' : 'text-gray-500'}`}>
                    {validations.password.hasUppercase ? <CheckCircle className="h-3 w-3 mr-1" /> : <div className="h-3 w-3 rounded-full border border-gray-300 mr-1"></div>}
                    Ít nhất 1 chữ hoa
                  </li>
                  <li className={`flex items-center ${validations.password.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                    {validations.password.hasNumber ? <CheckCircle className="h-3 w-3 mr-1" /> : <div className="h-3 w-3 rounded-full border border-gray-300 mr-1"></div>}
                    Ít nhất 1 chữ số
                  </li>
                  <li className={`flex items-center ${validations.password.hasSpecial ? 'text-green-600' : 'text-gray-500'}`}>
                    {validations.password.hasSpecial ? <CheckCircle className="h-3 w-3 mr-1" /> : <div className="h-3 w-3 rounded-full border border-gray-300 mr-1"></div>}
                    Ít nhất 1 ký tự đặc biệt
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Xác nhận mật khẩu
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`block w-full appearance-none rounded-md border ${validations.passwordsMatch && formData.confirmPassword ? 'border-green-500' : 'border-gray-300'} px-3 py-2 placeholder-gray-400 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm transition-colors duration-200`}
                  placeholder="Xác nhận mật khẩu"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {formData.confirmPassword && !validations.passwordsMatch && (
                <p className="mt-1 text-xs text-red-600">Mật khẩu không khớp</p>
              )}
              {formData.confirmPassword && validations.passwordsMatch && (
                <p className="mt-1 text-xs text-green-600 flex items-center">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Mật khẩu khớp
                </p>
              )}
            </div>

            <div>
              <label htmlFor="secretKey" className="block text-sm font-medium text-gray-700">
                Mã bí mật
              </label>
              <div className="mt-1">
                <input
                  id="secretKey"
                  name="secretKey"
                  type="password"
                  required
                  value={formData.secretKey}
                  onChange={handleChange}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm transition-colors duration-200"
                  placeholder="Nhập mã bí mật"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Mã bí mật dùng để xác nhận quyền tạo tài khoản quản trị
              </p>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !isFormValid()}
                className="flex w-full justify-center rounded-md border border-transparent bg-gradient-to-r from-red-600 to-red-700 py-2 px-4 text-sm font-medium text-white shadow-sm hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:translate-y-[-1px]"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang xử lý...
                  </span>
                ) : 'Đăng ký'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">Đã có tài khoản?</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/"
                className="flex w-full justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors duration-200"
              >
                Đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 