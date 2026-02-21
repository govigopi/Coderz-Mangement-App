import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';

class AuthProvider with ChangeNotifier {
  final ApiService _api = ApiService();
  UserModel? _user;
  String? _token;
  bool _loading = false;

  UserModel? get user => _user;
  String? get token => _token;
  bool get isAuth => _token != null;
  bool get loading => _loading;

  ApiService get api => _api;

  static const _keyToken = 'auth_token';
  static const _keyUser = 'auth_user';

  Future<void> loadFromStorage() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString(_keyToken);
    final userJson = prefs.getString(_keyUser);
    if (_token != null) _api.setToken(_token);
    if (userJson != null) {
      try {
        final map = jsonDecode(userJson) as Map<String, dynamic>;
        _user = UserModel.fromJson(map);
      } catch (_) {}
    }
    notifyListeners();
  }

  Future<void> login(String email, String password, {String role = 'admin'}) async {
    _loading = true;
    notifyListeners();
    try {
      final data = await _api.login(email, password, role: role);
      _token = data['token'] as String;
      _user = UserModel.fromJson(data['user'] as Map<String, dynamic>);
      _api.setToken(_token);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_keyToken, _token!);
      await prefs.setString(_keyUser, jsonEncode(data['user']));
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    _api.setToken(null);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyToken);
    await prefs.remove(_keyUser);
    notifyListeners();
  }
}
