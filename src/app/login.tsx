'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import authUtils from '@/utils/authUtils';
import config from '@/config/config';
import { toast } from 'react-hot-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Eye, 
    EyeOff, 
    User, 
    Lock, 
    ArrowRight, 
    Coffee, 
    Youtube, 
    Facebook,
    Shield,
    Zap,
    BarChart3,
    CreditCard,
    Users,
    Globe,
    TrendingUp
} from 'lucide-react';

const LoginPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });

    useEffect(() => {
        setMounted(true);
        
        // Kiểm tra nếu đã đăng nhập
        if (authUtils.isAuthenticated()) {
            const returnUrl = searchParams?.get('returnUrl') || config.ROUTES.DASHBOARD;
            router.push(returnUrl);
            return;
        }

        if (searchParams?.get('kicked') === 'true') {
            toast.error('Tài khoản đã được đăng nhập từ một thiết bị khác. Phiên trên thiết bị này đã kết thúc!', { duration: 6000, id: 'kicked-toast' });
        }

        // Lưu returnUrl từ URL params
        const returnUrl = searchParams?.get('returnUrl');
        if (returnUrl && typeof window !== 'undefined') {
            authUtils.saveReturnUrl(returnUrl);
        }
    }, [router, searchParams]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.username.trim() || !formData.password.trim()) {
            toast.error('Vui lòng nhập đầy đủ thông tin đăng nhập!');
            return;
        }

        setLoading(true);
        try {
            const user = await authUtils.login(formData.username, formData.password);
            console.log('Login successful:', user);
            
            // Hiển thị tên người dùng từ data
            const displayName = (user as any)?.['Họ và Tên'] || (user as any)?.username || formData.username;
            toast.success(`Chào mừng ${displayName} đến với H2 MilkTea!`);

            // Đợi một chút để cookie được set
            await new Promise(resolve => setTimeout(resolve, 100));

            // Lấy returnUrl từ authUtils hoặc searchParams
            let returnUrl = authUtils.getAndClearReturnUrl();
            
            // Nếu có returnUrl trong URL params, ưu tiên sử dụng
            if (searchParams?.get('returnUrl')) {
                returnUrl = decodeURIComponent(searchParams.get('returnUrl')!);
            }

            console.log('Redirecting to:', returnUrl);

            // Sử dụng window.location thay vì router.push để tránh conflict với middleware
            window.location.href = returnUrl;
            
        } catch (error: any) {
            console.error('Login error:', error);
            toast.error(error.message || 'Đăng nhập thất bại!');
        } finally {
            setLoading(false);
        }
    };

    // Features data
    const features = [
        {
            icon: BarChart3,
            title: 'Báo cáo thống kê',
            description: 'Dữ liệu bản demo dữ liệu local , Dữ liệu real-time(pro) ',
        },
        {
            icon: Shield,
            title: 'Bảo mật cao',
            description: 'Mã hóa dữ liệu 256-bit (pro), đảm bảo an toàn tuyệt đối',
        },
        {
            icon: Zap,
            title: 'Tốc độ cao',
            description: 'Xử lý giao dịch nhanh chóng, không giới hạn',
        },
        {
            icon: CreditCard,
            title: 'Đa thanh toán (pro)',
            description: 'Hỗ trợ nhiều hình thức thanh toán hiện đại , tạo hóa đơn điện tử',
        },
        {
            icon: Users,
            title: 'Quản lý nhân viên',
            description: 'Phân quyền chi tiết, theo dõi hiệu suất',
        },
        {
            icon: TrendingUp,
            title: 'Dự báo kinh doanh (pro)',
            description: 'Phân tích xu hướng, tối ưu lợi nhuận',
        }
    ];

    // Social media links
    const socialLinks = [
        {
            name: 'YouTube',
            icon: Youtube,
            url: 'https://www.youtube.com/maillvn',
            color: 'bg-red-500 hover:bg-red-600',
            description: 'Video hướng dẫn sử dụng'
        },
        {
            name: 'Facebook',
            icon: Facebook,
            url: 'https://www.facebook.com/maillovn',
            color: 'bg-blue-600 hover:bg-blue-700',
            description: 'Cộng đồng người dùng'
        },
    ];

    const handleSocialClick = (url: string, name: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
        toast.success(`Đang mở ${name}...`);
    };

    if (!mounted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-cyan-400 rounded-full animate-spin animate-reverse"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900 relative">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Floating orbs */}
                <div className="absolute top-20 left-20 w-64 h-64 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
                <div className="absolute top-40 right-20 w-64 h-64 bg-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-20 left-40 w-64 h-64 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
                <div className="absolute bottom-40 right-40 w-64 h-64 bg-cyan-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-6000"></div>
            </div>

            <div className="container relative z-10 mx-auto px-4 py-8 lg:py-12">
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[calc(100vh-4rem)]">
                    
                    {/* Left Side (Desktop: Left Col / Mobile: Bottom Col after Login) */}
                    <div className="text-white space-y-8 order-2 lg:order-1 pt-6 lg:pt-0">
                        {/* Logo & Brand (Desktop view) */}
                        <div className="hidden lg:block space-y-6">
                            <div className="flex items-center space-x-4">
                                <div className="relative">
                                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-2xl shadow-2xl">
                                        <Coffee className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full border-4 border-blue-900 flex items-center justify-center">
                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                    </div>
                                </div>
                                <div>
                                    <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
                                        H2 MilkTea
                                    </h1>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <span className="text-sm text-blue-200">Version 1.0</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-3xl lg:text-4xl font-bold leading-tight">
                                    Hệ thống quản lý bán hàng & POS thông minh
                                </h2>
                            </div>
                        </div>

                        {/* Features Grid */}
                        <div className="grid sm:grid-cols-2 gap-4">
                            {features.map((feature, index) => {
                                const IconComponent = feature.icon;
                                return (
                                    <div key={index} className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105">
                                        <div className="flex items-start space-x-4">
                                            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <IconComponent className="w-6 h-6 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-white mb-2 group-hover:text-cyan-200 transition-colors">
                                                    {feature.title}
                                                </h3>
                                                <p className="text-sm text-blue-200 leading-relaxed">
                                                    {feature.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Social Links */}
                        <div className="flex items-center space-x-4 pt-2">
                            <div className="flex items-center space-x-2 text-blue-200">
                                <Globe className="w-5 h-5" />
                                <span className="text-sm font-medium">Kết nối với chúng tôi:</span>
                            </div>
                            {socialLinks.map((social) => {
                                const IconComponent = social.icon;
                                return (
                                    <button
                                        key={social.name}
                                        type="button"
                                        onClick={() => handleSocialClick(social.url, social.name)}
                                        className="group w-12 h-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl flex items-center justify-center transition-all duration-300 hover:bg-white/20 hover:scale-110"
                                        title={social.description}
                                    >
                                        <IconComponent className="w-5 h-5 text-blue-200 group-hover:text-white transition-colors" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Side - Login Form (Mobile: Top Col order-1 / Desktop: Right Col order-2) (Mục #9) */}
                    <div className="flex flex-col items-center justify-center order-1 lg:order-2">
                        {/* Mobile Brand Header */}
                        <div className="lg:hidden text-center mb-6">
                            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-2xl shadow-xl mb-3">
                                <Coffee className="w-7 h-7 text-white" />
                            </div>
                            <h1 className="text-3xl font-extrabold text-white tracking-tight">H2 MilkTea</h1>
                            <p className="text-xs text-blue-200 mt-1 font-medium">Hệ thống quản lý bán hàng & POS thông minh</p>
                        </div>

                        <div className="w-full max-w-md">
                            <Card className="bg-white/95 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/20 overflow-hidden">
                                <CardContent className="p-6 sm:p-8">
                                    
                                    {/* Header text on Card */}
                                    <div className="mb-6 text-center">
                                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Đăng nhập tài khoản</h2>
                                        <p className="text-xs sm:text-sm text-gray-500 mt-1">Truy cập vào hệ thống làm việc của bạn</p>
                                    </div>

                                    {/* Return URL Alert */}
                                    {searchParams?.get('returnUrl') && (
                                        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500 rounded-lg">
                                            <div className="flex items-center">
                                                <Shield className="w-5 h-5 mr-3 text-blue-600 flex-shrink-0" />
                                                <p className="text-sm font-medium text-blue-800">
                                                    Yêu cầu xác thực để truy cập chức năng
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        {/* Username Field */}
                                        <div className="space-y-2">
                                            <Label className="text-sm font-bold text-gray-700 flex items-center">
                                                <User className="w-4 h-4 mr-2 text-blue-600" />
                                                Tên đăng nhập
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    name="username"
                                                    type="text"
                                                    required
                                                    autoFocus
                                                    placeholder="Nhập tên đăng nhập"
                                                    className="pl-4 pr-4 py-3 sm:py-4 text-base bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                    value={formData.username}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                        </div>

                                        {/* Password Field */}
                                        <div className="space-y-2">
                                            <Label className="text-sm font-bold text-gray-700 flex items-center">
                                                <Lock className="w-4 h-4 mr-2 text-blue-600" />
                                                Mật khẩu
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    name="password"
                                                    type={showPassword ? 'text' : 'password'}
                                                    required
                                                    placeholder="Nhập mật khẩu"
                                                    className="pl-4 pr-12 py-3 sm:py-4 text-base bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                    value={formData.password}
                                                    onChange={handleChange}
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    tabIndex={-1}
                                                >
                                                    {showPassword ? (
                                                        <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                                                    ) : (
                                                        <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Remember Me */}
                                        <div className="flex items-center justify-between pt-1">
                                            <div className="flex items-center">
                                                <input
                                                    id="remember-me"
                                                    name="remember-me"
                                                    type="checkbox"
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                                                />
                                                <label htmlFor="remember-me" className="ml-2 text-xs sm:text-sm text-gray-700 font-medium cursor-pointer">
                                                    Ghi nhớ đăng nhập
                                                </label>
                                            </div>
                                            <button type="button" className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">
                                                Quên mật khẩu?
                                            </button>
                                        </div>

                                        {/* Submit Button */}
                                        <Button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl py-3.5 sm:py-4 text-base font-bold transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:scale-[1.01]"
                                        >
                                            {loading ? (
                                                <div className="flex items-center justify-center">
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                                                    Đang xử lý...
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center">
                                                    <Shield className="w-5 h-5 mr-2 sm:mr-3" />
                                                    Đăng nhập hệ thống
                                                    <ArrowRight className="ml-2 sm:ml-3 w-5 h-5" />
                                                </div>
                                            )}
                                        </Button>
                                    </form>

                                    {/* Footer */}
                                    <div className="mt-6 sm:mt-8 text-center space-y-2">
                                        <p className="text-xs sm:text-sm text-gray-600">
                                            Cần hỗ trợ?{' '}
                                            <button className="text-blue-600 font-bold hover:text-blue-800 transition-colors">
                                                Liên hệ 0985561909 - Trần Văn Hà
                                            </button>
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
