class Order:

    def __init__(self, id, restaurant_id, delivery_latitude, delivery_longitude):
        self.id =id
        self.restaurant_id = restaurant_id
        self.update_location(delivery_latitude, delivery_longitude)
        self.courier_id = None
        self.status = "pending"

    def update_location(self, delivery_latitude, delivery_longitude):
        if not -90 <= delivery_latitude <= 90:
            raise ValueError("Географската ширина трябва да е между -90 и 90.")
        if not -180 <= delivery_longitude <= 180:
            raise ValueError("Географската дължина трябва да е между -180 и 180")

        self.delivery_latitude = delivery_latitude
        self.delivery_longitude = delivery_longitude