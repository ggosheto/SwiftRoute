class Courier:

    def __init__(self, id, name, latitude, longitude, is_available):
        self.update_location(latitude, longitude)
        self.id = id
        self.name = name
        self.is_available = is_available

    def update_location(self, latitude, longitude):
        if not -90 <= latitude <= 90:
            raise ValueError("Географската ширина трябва да е между -90 и 90.")
        if not -180 <= longitude <= 180:
            raise ValueError("Географската дължина трябва да е между -180 и 180")

        self.latitude = latitude
        self.longitude = longitude