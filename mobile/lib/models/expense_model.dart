class ExpenseModel {
  final String id;
  final double amount;
  final DateTime date;
  final String? category;
  final String description;

  ExpenseModel({
    required this.id,
    required this.amount,
    required this.date,
    this.category,
    required this.description,
  });

  factory ExpenseModel.fromJson(Map<String, dynamic> json) {
    return ExpenseModel(
      id: json['_id'] ?? '',
      amount: (json['amount'] ?? 0).toDouble(),
      date: json['date'] != null
          ? DateTime.parse(json['date'].toString())
          : DateTime.now(),
      category: json['category'],
      description: json['description'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'amount': amount,
        'date': date.toIso8601String(),
        'category': category,
        'description': description,
      };
}
