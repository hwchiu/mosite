from enum import Enum


class ServerStatus(str, Enum):
    purchased = "purchased"
    waiting_infra = "waiting_infra"
    waiting_cluster_setup = "waiting_cluster_setup"
    waiting_platform = "waiting_platform"
    active = "active"
    retired = "retired"


class ServerModel(str, Enum):
    model_1 = "model_1"
    model_2 = "model_2"
    model_3 = "model_3"


class ServiceType(str, Enum):
    k8s = "k8s"
    vm = "vm"


class ClusterType(str, Enum):
    k8s = "k8s"
    vm = "vm"
