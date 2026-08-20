from enum import Enum


class Role(str, Enum):
    user = "user"
    premium = "premium"
    admin = "admin"
