class ApiConfig {
  static const String baseUrl = 'http://10.0.2.2:5000/api'; // Android emulator -> localhost
  /// Server origin (no /api) for PDF/Excel download URLs
  static const String serverOrigin = 'http://10.0.2.2:5000';
  // For real device use your PC IP: 'http://192.168.x.x:5000'
  // For iOS simulator: 'http://localhost:5000'

  static String get auth => '$baseUrl/auth';
  static String get courses => '$baseUrl/courses';
  static String get students => '$baseUrl/students';
  static String get invoices => '$baseUrl/invoices';
  static String get expenses => '$baseUrl/expenses';
  static String get income => '$baseUrl/income';
  static String get marks => '$baseUrl/marks';
  static String get reports => '$baseUrl/reports';
}
