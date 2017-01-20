#!/usr/bin/python

from setuptools import setup, find_packages

setup(
    name="reddit_place",
    description="April Fools 2017",
    version="0.0",
    packages=find_packages(),
    install_requires=[
        "r2",
    ],
    entry_points={
        "r2.plugin": [
            "place = reddit_place:Place",
        ],
    },
    zip_safe=False,
)
