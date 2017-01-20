from r2.lib.pages import Reddit
from r2.lib.wrapped import Templated


class PlacePage(Reddit):
    extra_stylesheets = Reddit.extra_stylesheets + ["place.less"]

    def __init__(self, title, content, **kwargs):
        super(PlacePage, self).__init__(
            title=title,
            content=content,
            **kwargs
        )


class PlaceCanvasse(Templated):
    pass
